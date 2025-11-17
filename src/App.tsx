import React, { useEffect, useState, ChangeEvent, FormEvent } from "react";
import "./App.css";

type Section = "calendar" | "todo" | "gallery";

type TodoPriority = "low" | "medium" | "high";

interface TodoItem {
  id: string;
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  priority: TodoPriority;
  done: boolean;
}

interface PhotoItem {
  id: string;
  title: string;
  createdAt: string;
  dataUrl: string; // base64
}

const LOCAL_STORAGE_KEYS = {
  TODOS: "love-planner-todos",
  PHOTOS: "love-planner-photos",
};

function getTodayDateString() {
  const d = new Date();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
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

  // Gallery
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [photoTitle, setPhotoTitle] = useState("");

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

    try {
      const rawPhotos = localStorage.getItem(LOCAL_STORAGE_KEYS.PHOTOS);
      if (rawPhotos) {
        setPhotos(JSON.parse(rawPhotos));
      }
    } catch (e) {
      console.error("Failed to load photos", e);
    }
  }, []);

  // ----- LocalStorage Save -----
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.TODOS, JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.PHOTOS, JSON.stringify(photos));
  }, [photos]);

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

  // ----- Photo Handlers -----
  const handlePhotoFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const newPhoto: PhotoItem = {
        id: crypto.randomUUID(),
        title: photoTitle.trim() || file.name,
        createdAt: new Date().toISOString(),
        dataUrl,
      };
      setPhotos((prev) => [newPhoto, ...prev]);
      setPhotoTitle("");
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const deletePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // ----- Preview (미리보기) -----
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

  const totalTodos = todos.length;
  const doneTodos = todos.filter((t) => t.done).length;
  const overdueTodos = todos.filter(
    (t) => !t.done && t.dueDate < todayString
  ).length;

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
              {week.map((d, j) => (
                <div
                  key={j}
                  className={`calendar-cell ${
                    d ? "calendar-cell-active" : "calendar-cell-empty"
                  } ${isToday(d) ? "calendar-today" : ""}`}
                >
                  {d ?? ""}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="calendar-footer">
          🌸 둘만의 기념일, 데이트 약속을 달력에 적어두고 같이 확인해 보세요.
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

  const renderGallery = () => {
    return (
      <div className="card">
        <div className="card-header">
          <div className="card-title">우리 사진 앨범</div>
          <div className="card-subtitle">
            함께한 시간들을 사진으로 남겨 보세요 📷
          </div>
        </div>

        <div className="gallery-upload">
          <input
            className="input"
            placeholder="사진 제목 (예: 첫 여행, 첫 데이트)"
            value={photoTitle}
            onChange={(e) => setPhotoTitle(e.target.value)}
          />
          <label className="btn-secondary">
            사진 선택
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoFileChange}
              style={{ display: "none" }}
            />
          </label>
        </div>

        <div className="gallery-grid">
          {photos.length === 0 && (
            <div className="empty-text">
              아직 등록된 사진이 없어요.  
              둘이 찍은 사진을 하나 올려볼까요? 💑
            </div>
          )}
          {photos.map((p) => (
            <div key={p.id} className="photo-card">
              <img src={p.dataUrl} alt={p.title} className="photo-img" />
              <div className="photo-info">
                <div className="photo-title">{p.title}</div>
                <div className="photo-date">
                  {new Date(p.createdAt).toLocaleDateString("ko-KR")}
                </div>
              </div>
              <button
                className="btn-ghost"
                onClick={() => deletePhoto(p.id)}
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

        {/* 미리보기 카드 */}
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
            <div className="preview-label">다음 데이트 / 일정</div>
            {nextTodo ? (
              <>
                <div className="preview-main">{nextTodo.title}</div>
                <div className="preview-sub">
                  📅 {nextTodo.dueDate} · {getPriorityLabel(nextTodo.priority)}
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
              🔥 미완료 {totalTodos - doneTodos}개,  
              ⏰ 지남 {overdueTodos}개
            </div>
          </div>

          <div className="preview-card">
            <div className="preview-label">사진</div>
            <div className="preview-main">{photos.length}장</div>
            <div className="preview-sub">
              둘만의 추억이 점점 쌓이고 있어요 📸
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
          <button
            className={`nav-tab ${section === "gallery" ? "active" : ""}`}
            onClick={() => setSection("gallery")}
          >
            사진 앨범
          </button>
        </nav>

        <main className="app-main">
          {section === "calendar" && renderCalendar()}
          {section === "todo" && renderTodo()}
          {section === "gallery" && renderGallery()}
        </main>

        <footer className="app-footer">
          오늘도 예쁘게 사랑하고, 기록해요 🌷
        </footer>
      </div>
    </div>
  );
};

export default App;
