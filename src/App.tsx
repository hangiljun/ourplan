import React, { useEffect, useState, ChangeEvent, FormEvent } from "react";
import "./App.css";

type Section = "calendar" | "todo";

type TodoPriority = "low" | "medium" | "high";

interface TodoItem {
  id: string;
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  priority: TodoPriority;
  done: boolean;
}

const LOCAL_STORAGE_KEYS = {
  TODOS: "love-planner-todos",
};

function getTodayDateString() {
  const d = new Date();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function calcDDay(dueDateStr: string) {
  const today = new Date();
  const todayMid = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const [y, m, d] = dueDateStr.split("-").map(Number);
  const due = new Date(y, (m as number) - 1, d as number);
  const diffMs = due.getTime() - todayMid.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

function formatDateString(y: number, mZeroBased: number, d: number) {
  const month = `${mZeroBased + 1}`.padStart(2, "0");
  const day = `${d}`.padStart(2, "0");
  return `${y}-${month}-${day}`;
}

const App: React.FC = () => {
  const [section, setSection] = useState<Section>("calendar");

  // Calendar
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0~11

  // Todo
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todoForm, setTodoForm] = useState<{
    title: string;
    description: string;
    dueDate: string;
    priority: TodoPriority;
  }>({
    title: "",
    description: "",
    dueDate: getTodayDateString(),
    priority: "medium",
  });

  // ----- LocalStorage Load -----
  useEffect(() => {
    try {
      const rawTodos = localStorage.getItem(LOCAL_STORAGE_KEYS.TODOS);
      if (rawTodos) {
        setTodos(JSON.parse(rawTodos));
      }
    } catch (e) {
      console.error("Failed to load todos", e);
    }
  }, []);

  // ----- LocalStorage Save -----
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.TODOS, JSON.stringify(todos));
  }, [todos]);

  // ----- Calendar helpers -----
  const goPrevMonth = () => {
    setMonth((prev) => {
      if (prev === 0) {
        setYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const goNextMonth = () => {
    setMonth((prev) => {
      if (prev === 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const makeCalendarMatrix = () => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstWeekDay = firstDay.getDay(); // 0:일 ~ 6:토
    const daysInMonth = lastDay.getDate();

    const cells: (number | null)[] = [];
    for (let i = 0; i < firstWeekDay; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(d);
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    const weeks: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
  };

  const isToday = (d: number | null) => {
    if (!d) return false;
    return (
      d === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  // ----- Todo Handlers -----
  const handleTodoChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setTodoForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTodoSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!todoForm.title.trim()) return;

    const newTodo: TodoItem = {
      id: crypto.randomUUID(),
      title: todoForm.title.trim(),
      description: todoForm.description.trim(),
      dueDate: todoForm.dueDate,
      priority: todoForm.priority,
      done: false,
    };

    setTodos((prev) => [newTodo, ...prev]);
    setTodoForm((prev) => ({
      ...prev,
      title: "",
      description: "",
    }));
  };

  const toggleTodoDone = (id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const getPriorityLabel = (p: TodoPriority) => {
    if (p === "high") return "★ 중요";
    if (p === "medium") return "☆ 보통";
    return "· 여유";
  };

  // ----- Preview (미리보기 / D-day) -----
  const todayString = getTodayDateString();

  const upcomingTodos = todos
    .filter((t) => !t.done && t.dueDate >= todayString)
    .sort((a, b) => {
      if (a.dueDate !== b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate);
      }
      const order: TodoPriority[] = ["high", "medium", "low"];
      return order.indexOf(a.priority) - order.indexOf(b.priority);
    });

  const nextTodo = upcomingTodos[0];
  const nextTodoDDay = nextTodo ? calcDDay(nextTodo.dueDate) : null;

  const totalTodos = todos.length;
  const doneTodos = todos.filter((t) => t.done).length;
  const overdueTodos = todos.filter(
    (t) => !t.done && t.dueDate < todayString
  ).length;

  // ----- Calendar Important (중요 일정) -----
  // 중요도 high 인 일정들을 날짜 Set 로 관리
  const importantDateSet = new Set<string>();
  todos
    .filter((t) => t.priority === "high")
    .forEach((t) => importantDateSet.add(t.dueDate));

  // ----- Render Sections -----
  const renderCalendar = () => {
    const weeks = makeCalendarMatrix();
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

    return (
      <div className="card">
        <div className="card-header space-between">
          <div className="card-title">데이트 달력</div>
          <div className="calendar-nav">
            <button onClick={goPrevMonth}>◀</button>
            <span>
              {year}년 {month + 1}월
            </span>
            <button onClick={goNextMonth}>▶</button>
          </div>
        </div>
        <div className="calendar-weekdays">
          {dayNames.map((d) => (
            <div key={d} className="calendar-weekday">
              {d}
            </div>
          ))}
        </div>
        <div className="calendar-body">
          {weeks.map((week, i) => (
            <div key={i} className="calendar-row">
              {week.map((d, j) => {
                const isWeekend = j === 0 || j === 6; // 일(0), 토(6)
                const dateStr =
                  d != null ? formatDateString(year, month, d) : null;
                const isImportant =
                  d != null && dateStr
                    ? importantDateSet.has(dateStr)
                    : false;

                return (
                  <div
                    key={j}
                    className={[
                      "calendar-cell",
                      d ? "calendar-cell-active" : "calendar-cell-empty",
                      isToday(d) ? "calendar-today" : "",
                      isWeekend ? "calendar-weekend" : "",
                      isImportant ? "calendar-important" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {d != null && (
                      <div className="calendar-cell-inner">
                        <span className="calendar-day-number">{d}</span>
                        {isImportant && (
                          <span className="calendar-important-dot">
                            ●
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="calendar-footer">
          🌸 중요 일정(★)은 달력에 붉은 점으로 표시돼요.
        </div>
      </div>
    );
  };

  const renderTodo = () => {
    const sorted = [...todos].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.priority !== b.priority) {
        const order: TodoPriority[] = ["high", "medium", "low"];
        return order.indexOf(a.priority) - order.indexOf(b.priority);
      }
      return a.dueDate.localeCompare(b.dueDate);
    });

    return (
      <div className="card">
        <div className="card-header">
          <div className="card-title">해야 할 일</div>
          <div className="card-subtitle">
            함께 준비해야 할 데이트, 기념일, 선물 계획을 정리해 보세요.
          </div>
        </div>

        <form className="todo-form" onSubmit={handleTodoSubmit}>
          <div className="todo-form-row">
            <input
              name="title"
              className="input"
              placeholder="할 일을 간단하게 적어주세요 (예: 다음 데이트 예약하기)"
              value={todoForm.title}
              onChange={handleTodoChange}
            />
          </div>
          <div className="todo-form-row">
            <textarea
              name="description"
              className="textarea"
              placeholder="더 자세한 메모가 필요하다면 여기에 적어주세요"
              value={todoForm.description}
              onChange={handleTodoChange}
            />
          </div>
          <div className="todo-form-row todo-form-bottom">
            <div className="todo-form-inline">
              <label className="label">
                날짜
                <input
                  type="date"
                  name="dueDate"
                  className="input"
                  value={todoForm.dueDate}
                  onChange={handleTodoChange}
                />
              </label>
              <label className="label">
                중요도
                <select
                  name="priority"
                  className="input"
                  value={todoForm.priority}
                  onChange={handleTodoChange}
                >
                  <option value="high">★ 중요</option>
                  <option value="medium">☆ 보통</option>
                  <option value="low">· 여유</option>
                </select>
              </label>
            </div>
            <button type="submit" className="btn-primary">
              추가하기
            </button>
          </div>
        </form>

        <div className="todo-list">
          {sorted.length === 0 && (
            <div className="empty-text">
              아직 등록된 할 일이 없어요.
              <br />
              둘이 같이 하고 싶은 일을 하나 적어볼까요? 💌
            </div>
          )}
          {sorted.map((t) => (
            <div key={t.id} className="todo-item">
              <div className="todo-main">
                <label className="todo-checkbox">
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={() => toggleTodoDone(t.id)}
                  />
                  <span className={t.done ? "todo-title done" : "todo-title"}>
                    {t.title}
                  </span>
                </label>
                <span
                  className={`todo-priority todo-priority-${t.priority}`}
                >
                  {getPriorityLabel(t.priority)}
                </span>
              </div>
              <div className="todo-meta">
                <span className="todo-date">📅 {t.dueDate}</span>
                {t.description && (
                  <span className="todo-desc">{t.description}</span>
                )}
              </div>
              <button
                className="btn-ghost"
                onClick={() => deleteTodo(t.id)}
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="app-root">
      <div className="app-container">
        <header className="app-header">
          <div>
            <h1 className="app-title">연애 플래너</h1>
            <p className="app-subtitle">
              둘만의 일정, 해야 할 일, 추억까지 한 곳에서 정리하는 작은 공간 💘
            </p>
          </div>
        </header>

        {/* 상단 미리보기 + D-day */}
        <section className="preview-row">
          <div className="preview-card">
            <div className="preview-label">오늘</div>
            <div className="preview-main">
              {new Date().toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "short",
              })}
            </div>
            <div className="preview-sub">
              오늘도 서로에게 조금 더 다정하게 💗
            </div>
          </div>

          <div className="preview-card">
            <div className="preview-label">다음 일정</div>
            {nextTodo ? (
              <>
                <div className="preview-main">{nextTodo.title}</div>
                <div className="preview-sub">
                  📅 {nextTodo.dueDate} · {getPriorityLabel(nextTodo.priority)}{" "}
                  {nextTodoDDay !== null && (
                    <span className="dday-chip">
                      {nextTodoDDay === 0
                        ? "D-Day"
                        : `D-${nextTodoDDay}`}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="preview-main">등록된 일정 없음</div>
                <div className="preview-sub">
                  다음 데이트를 하나 정해볼까요? 😊
                </div>
              </>
            )}
          </div>

          <div className="preview-card">
            <div className="preview-label">요약</div>
            <div className="preview-main">
              할 일 {doneTodos}/{totalTodos}
            </div>
            <div className="preview-sub">
              🔥 미완료 {totalTodos - doneTodos}개, ⏰ 지남 {overdueTodos}개
            </div>
          </div>
        </section>

        <nav className="nav-tabs">
          <button
            className={`nav-tab ${section === "calendar" ? "active" : ""}`}
            onClick={() => setSection("calendar")}
          >
            달력
          </button>
          <button
            className={`nav-tab ${section === "todo" ? "active" : ""}`}
            onClick={() => setSection("todo")}
          >
            해야 할 일
          </button>
        </nav>

        <main className="app-main">
          {section === "calendar" && renderCalendar()}
          {section === "todo" && renderTodo()}
        </main>

        <footer className="app-footer">
          오늘도 예쁘게 사랑하고, 기록해요 🌷
        </footer>
      </div>
    </div>
  );
};

export default App;
