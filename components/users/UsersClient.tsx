"use client";

import { useState } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  ADMIN: { label: "管理員", color: "bg-red-900/30 text-red-400 border-red-700" },
  EDITOR: { label: "編輯者", color: "bg-blue-900/30 text-blue-400 border-blue-700" },
  VIEWER: { label: "檢視者", color: "bg-gray-800 text-gray-400 border-gray-700" },
};

export function UsersClient({
  initialUsers,
  currentEmail,
}: {
  initialUsers: User[];
  currentEmail: string;
}) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("VIEWER");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editName, setEditName] = useState("");

  async function addUser() {
    if (!newEmail || !newName) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, name: newName, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "新增失敗");
        return;
      }
      setUsers([...users, data.data]);
      setNewEmail("");
      setNewName("");
      setNewRole("VIEWER");
      setShowAdd(false);
      setSuccess("使用者已新增，可使用 Google 登入");
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("新增失敗");
    } finally {
      setSaving(false);
    }
  }

  async function updateUser(id: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, role: editRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "更新失敗");
        return;
      }
      setUsers(users.map((u) => (u.id === id ? data.data : u)));
      setEditingId(null);
      setSuccess("已更新");
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("更新失敗");
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(id: string, email: string) {
    if (!confirm(`確定要刪除 ${email} 的登入權限？`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/v1/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "刪除失敗");
        return;
      }
      setUsers(users.filter((u) => u.id !== id));
      setSuccess("已移除登入權限");
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("刪除失敗");
    }
  }

  function startEdit(user: User) {
    setEditingId(user.id);
    setEditRole(user.role);
    setEditName(user.name);
  }

  return (
    <div>
      {error && (
        <div className="mb-4 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-900/30 border border-green-700 rounded-lg px-3 py-2 text-sm text-green-300">
          {success}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-gray-200">{users.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">使用者總數</p>
        </div>
        <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-red-400">
            {users.filter((u) => u.role === "ADMIN").length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">管理員</p>
        </div>
        <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-400">
            {users.filter((u) => u.role === "EDITOR").length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">編輯者</p>
        </div>
      </div>

      {/* Add user button */}
      {!showAdd && (
        <button
          onClick={() => setShowAdd(true)}
          className="mb-6 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded-lg px-4 py-2 transition"
        >
          + 新增使用者
        </button>
      )}

      {/* Add user form */}
      {showAdd && (
        <div className="mb-6 bg-gray-900 border border-amber-800/50 rounded-xl p-4">
          <h3 className="text-sm font-bold text-gray-300 mb-3">新增 Google 登入使用者</h3>
          <p className="text-xs text-gray-500 mb-3">
            輸入使用者的 Gmail 信箱，儲存後該帳號即可使用 Google 登入後台。
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Gmail 信箱</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@gmail.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">顯示名稱</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="王小明"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">角色權限</label>
              <div className="flex gap-2">
                {(["ADMIN", "EDITOR", "VIEWER"] as const).map((r) => {
                  const meta = ROLE_LABELS[r];
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setNewRole(r)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                        newRole === r ? meta.color : "border-gray-700 text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={addUser}
                disabled={saving || !newEmail || !newName}
                className="bg-amber-600 hover:bg-amber-500 text-white rounded-lg px-4 py-2 text-sm transition disabled:opacity-50"
              >
                {saving ? "新增中..." : "新增使用者"}
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="text-gray-500 hover:text-gray-300 text-sm transition px-4 py-2"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User list */}
      <div className="space-y-2">
        {users.map((user) => {
          const isMe = user.email === currentEmail;
          const isEditing = editingId === user.id;
          const roleMeta = ROLE_LABELS[user.role] || ROLE_LABELS.VIEWER;

          return (
            <div
              key={user.id}
              className={`bg-gray-900 border rounded-xl p-4 transition ${
                isEditing ? "border-amber-600" : "border-gray-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Avatar placeholder */}
                  <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
                    <span className="text-sm text-gray-400">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    {isEditing ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-sm text-gray-200 focus:outline-none focus:border-amber-500 mb-0.5"
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-200 truncate">
                        {user.name}
                        {isMe && (
                          <span className="text-xs text-amber-500 ml-2">（你）</span>
                        )}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isEditing ? (
                    <>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="ADMIN">管理員</option>
                        <option value="EDITOR">編輯者</option>
                        <option value="VIEWER">檢視者</option>
                      </select>
                      <button
                        onClick={() => updateUser(user.id)}
                        disabled={saving}
                        className="text-xs bg-amber-600 hover:bg-amber-500 text-white rounded px-3 py-1 transition disabled:opacity-50"
                      >
                        儲存
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs text-gray-500 hover:text-gray-300 transition"
                      >
                        取消
                      </button>
                    </>
                  ) : (
                    <>
                      <span
                        className={`text-xs px-2 py-0.5 rounded border ${roleMeta.color}`}
                      >
                        {roleMeta.label}
                      </span>
                      <button
                        onClick={() => startEdit(user)}
                        className="text-xs text-amber-400 hover:text-amber-300 transition"
                      >
                        編輯
                      </button>
                      {!isMe && (
                        <button
                          onClick={() => deleteUser(user.id, user.email)}
                          className="text-xs text-red-400 hover:text-red-300 transition"
                        >
                          移除
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
