"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUpload } from "@/components/ui/ImageUpload";

type RichMenu = {
  id: string;
  name: string;
  lineMenuId: string | null;
  aliasId: string | null;
  imageUrl: string | null;
  size: { width: number; height: number };
  areas: Area[];
  isDefault: boolean;
  isActive: boolean;
  env: string;
  pairedWith: string | null;
  createdAt: string;
};

type Area = {
  bounds: { x: number; y: number; width: number; height: number };
  action: {
    type: string;
    uri?: string;
    data?: string;
    text?: string;
    label?: string;
    richMenuAliasId?: string;
  };
};

type LayoutType = "2col" | "3col" | "2x3";

const LAYOUTS: Record<LayoutType, { label: string; count: number }> = {
  "2col": { label: "2 欄 (左/右)", count: 2 },
  "3col": { label: "3 欄", count: 3 },
  "2x3": { label: "2 列 x 3 欄 (6 區)", count: 6 },
};

function generateAreas(
  layout: LayoutType,
  w: number,
  h: number
): Area[] {
  const areas: Area[] = [];
  if (layout === "2col") {
    const cellW = Math.floor(w / 2);
    areas.push(
      { bounds: { x: 0, y: 0, width: cellW, height: h }, action: { type: "uri", uri: "" } },
      { bounds: { x: cellW, y: 0, width: w - cellW, height: h }, action: { type: "uri", uri: "" } }
    );
  } else if (layout === "3col") {
    const cellW = Math.floor(w / 3);
    for (let i = 0; i < 3; i++) {
      const x = cellW * i;
      const width = i === 2 ? w - cellW * 2 : cellW;
      areas.push({ bounds: { x, y: 0, width, height: h }, action: { type: "uri", uri: "" } });
    }
  } else if (layout === "2x3") {
    const cellW = Math.floor(w / 3);
    const cellH = Math.floor(h / 2);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const x = cellW * col;
        const y = cellH * row;
        const width = col === 2 ? w - cellW * 2 : cellW;
        const height = row === 1 ? h - cellH : cellH;
        areas.push({ bounds: { x, y, width, height }, action: { type: "uri", uri: "" } });
      }
    }
  }
  return areas;
}

const RICH_MENU_PRESETS = [
  {
    id: "new-customer",
    icon: "🌱",
    label: "新客版",
    desc: "適合初次加入的客戶：品牌認識、產品瀏覽、門市查詢",
    name: "DEREK 新客選單",
    layout: "2x3" as LayoutType,
    areas: [
      { label: "📍 尋找門市", action: { type: "message" as const, text: "門市" } },
      { label: "🛁 產品目錄", action: { type: "message" as const, text: "產品" } },
      { label: "📞 聯絡我們", action: { type: "uri" as const, uri: "tel:0800063366", label: "免費客服專線" } },
      { label: "🌐 品牌官網", action: { type: "uri" as const, uri: "https://www.lcb.com.tw", label: "DEREK 官網" } },
      { label: "🤝 推薦好友", action: { type: "message" as const, text: "推薦" } },
      { label: "🔄 切換熟客選單", action: { type: "richmenuswitch" as const, richMenuAliasId: "richmenu-alias-vip", data: "richmenu-changed-to-vip" } },
    ],
  },
  {
    id: "vip-customer",
    icon: "💎",
    label: "熟客版",
    desc: "適合回購客戶：維修預約、推薦碼、新品資訊",
    name: "DEREK 熟客選單",
    layout: "2x3" as LayoutType,
    areas: [
      { label: "🔧 維修預約", action: { type: "message" as const, text: "維修" } },
      { label: "🤝 推薦好友", action: { type: "message" as const, text: "推薦" } },
      { label: "📞 聯絡我們", action: { type: "uri" as const, uri: "tel:0800063366", label: "免費客服專線" } },
      { label: "📍 尋找門市", action: { type: "message" as const, text: "門市" } },
      { label: "🛁 產品目錄", action: { type: "message" as const, text: "產品" } },
      { label: "🔄 切換新客選單", action: { type: "richmenuswitch" as const, richMenuAliasId: "richmenu-alias-new", data: "richmenu-changed-to-new" } },
    ],
  },
];

export function RichMenuClient({
  initialMenus,
}: {
  initialMenus: RichMenu[];
}) {
  const router = useRouter();
  const [menus, setMenus] = useState<RichMenu[]>(initialMenus);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pairDeploying, setPairDeploying] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formEnv, setFormEnv] = useState("production");
  const [formLayout, setFormLayout] = useState<LayoutType>("2col");
  const [formAreas, setFormAreas] = useState<Area[]>(
    generateAreas("2col", 2500, 1686)
  );

  function resetForm() {
    setFormName("");
    setFormImageUrl("");
    setFormEnv("production");
    setFormLayout("2col");
    setFormAreas(generateAreas("2col", 2500, 1686));
    setEditingId(null);
    setShowForm(false);
  }

  function handleLayoutChange(layout: LayoutType) {
    setFormLayout(layout);
    setFormAreas(generateAreas(layout, 2500, 1686));
  }

  function updateAreaAction(
    index: number,
    field: "type" | "uri" | "data" | "text" | "label" | "richMenuAliasId",
    value: string
  ) {
    setFormAreas((prev: Area[]) =>
      prev.map((area: Area, i: number) =>
        i === index
          ? { ...area, action: { ...area.action, [field]: value } }
          : area
      )
    );
  }

  function startEdit(menu: RichMenu) {
    setEditingId(menu.id);
    setFormName(menu.name);
    setFormImageUrl(menu.imageUrl || "");
    setFormEnv(menu.env);

    const areas = menu.areas || [];
    const count = areas.length;
    if (count === 2) setFormLayout("2col");
    else if (count === 3) setFormLayout("3col");
    else if (count === 6) setFormLayout("2x3");
    else setFormLayout("2col");

    setFormAreas(areas);
    setShowForm(true);
  }

  async function refreshMenus() {
    const listRes = await fetch("/api/v1/rich-menus");
    if (listRes.ok) {
      const data = await listRes.json();
      setMenus(data.menus);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;

    setLoading(true);
    try {
      const payload = {
        name: formName,
        imageUrl: formImageUrl || null,
        areas: formAreas,
        env: formEnv,
      };

      const url = editingId
        ? `/api/v1/rich-menus/${editingId}`
        : "/api/v1/rich-menus";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        resetForm();
        router.refresh();
        await refreshMenus();
      } else {
        const err = await res.json();
        alert(err.error || "操作失敗");
      }
    } catch {
      alert("操作失敗，請重試");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeploy(id: string) {
    if (!confirm("確定要部署此選單到 LINE？")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/v1/rich-menus/${id}/deploy`, {
        method: "POST",
      });
      if (res.ok) {
        await refreshMenus();
      } else {
        const err = await res.json();
        alert(err.error || "部署失敗");
      }
    } catch {
      alert("部署失敗，請重試");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSetDefault(id: string) {
    if (!confirm("確定要設為預設選單？")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/v1/rich-menus/${id}/set-default`, {
        method: "POST",
      });
      if (res.ok) {
        await refreshMenus();
      } else {
        const err = await res.json();
        alert(err.error || "設定失敗");
      }
    } catch {
      alert("設定失敗，請重試");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("確定要刪除此選單？如已部署到 LINE 也會一併刪除。")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/v1/rich-menus/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMenus((prev: RichMenu[]) => prev.filter((m: RichMenu) => m.id !== id));
      } else {
        const err = await res.json();
        alert(err.error || "刪除失敗");
      }
    } catch {
      alert("刪除失敗，請重試");
    } finally {
      setActionLoading(null);
    }
  }

  // Deploy paired menus: create both on LINE + aliases, then set new-customer as default
  async function handleDeployPair() {
    if (!confirm("將部署「新客版」和「熟客版」兩個選單到 LINE，並建立切換別名。新客版將設為預設選單。確定繼續？")) return;
    setPairDeploying(true);
    try {
      const res = await fetch("/api/v1/rich-menus/deploy-pair", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        alert(`配對部署成功！\n新客選單: ${data.newCustomerMenuId}\n熟客選單: ${data.vipCustomerMenuId}\n新客版已設為預設選單。`);
        await refreshMenus();
      } else {
        alert(data.error || "配對部署失敗");
      }
    } catch {
      alert("配對部署失敗，請重試");
    } finally {
      setPairDeploying(false);
    }
  }

  function getStatusBadge(menu: RichMenu) {
    if (menu.isDefault) {
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--brand-accent)]/15 text-[var(--brand-accent)] font-medium">
          預設選單
        </span>
      );
    }
    if (menu.lineMenuId) {
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">
          已部署
        </span>
      );
    }
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)] font-medium">
        未部署
      </span>
    );
  }

  function getAreaLabel(index: number, layout: LayoutType): string {
    if (layout === "2col") return index === 0 ? "左" : "右";
    if (layout === "3col") return ["左", "中", "右"][index] || `${index + 1}`;
    // 2x3
    const labels = ["左上", "中上", "右上", "左下", "中下", "右下"];
    return labels[index] || `${index + 1}`;
  }

  // Find paired menus in the list
  const hasPairedMenus = menus.some(m => m.pairedWith);
  const newCustomerMenu = menus.find(m => m.name.includes("新客"));
  const vipCustomerMenu = menus.find(m => m.name.includes("熟客"));
  const canDeployPair = newCustomerMenu && vipCustomerMenu && newCustomerMenu.imageUrl && vipCustomerMenu.imageUrl;

  return (
    <div>
      {/* Presets + Create button */}
      {!showForm && (
        <div className="mb-6 space-y-3">
          <div>
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">快速建立</h3>
            <div className="flex flex-wrap gap-2">
              {RICH_MENU_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    resetForm();
                    setFormName(preset.name);
                    setFormLayout(preset.layout);
                    const generated = generateAreas(preset.layout, 2500, 1686);
                    setFormAreas(
                      generated.map((area, i) => ({
                        ...area,
                        action: preset.areas[i]?.action || area.action,
                      }))
                    );
                    setShowForm(true);
                  }}
                  className="flex items-center gap-1.5 text-sm border border-[var(--border-strong)] text-[var(--text-secondary)] hover:border-[var(--brand-accent)] hover:text-[var(--brand-accent)] rounded-lg px-3 py-2 transition bg-[var(--card-bg)]"
                >
                  <span>{preset.icon}</span>
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Deploy Pair button */}
          {canDeployPair && (
            <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">🔄 配對部署（新客 ↔ 熟客 切換）</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    同時部署兩個選單到 LINE，建立切換別名，新客版設為預設
                  </p>
                </div>
                <button
                  onClick={handleDeployPair}
                  disabled={pairDeploying}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition disabled:opacity-50 shrink-0"
                >
                  {pairDeploying ? "部署中..." : "配對部署"}
                </button>
              </div>
              <div className="flex gap-3 mt-3">
                <div className="flex-1 bg-white/60 rounded-lg p-2 text-center">
                  <p className="text-xs text-[var(--text-muted)]">🌱 新客版</p>
                  <p className="text-xs font-medium text-[var(--text-primary)] truncate">{newCustomerMenu?.name}</p>
                  {newCustomerMenu?.lineMenuId && <p className="text-xs text-emerald-600">已部署</p>}
                </div>
                <div className="flex items-center text-lg">⇄</div>
                <div className="flex-1 bg-white/60 rounded-lg p-2 text-center">
                  <p className="text-xs text-[var(--text-muted)]">💎 熟客版</p>
                  <p className="text-xs font-medium text-[var(--text-primary)] truncate">{vipCustomerMenu?.name}</p>
                  {vipCustomerMenu?.lineMenuId && <p className="text-xs text-emerald-600">已部署</p>}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-[var(--brand-primary)] hover:bg-[var(--text-secondary)] text-white px-4 py-2 rounded-lg text-sm font-bold transition"
          >
            + 自訂圖文選單
          </button>
        </div>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-5 mb-6"
        >
          <h2 className="text-base font-bold text-[var(--text-primary)] mb-4">
            {editingId ? "編輯圖文選單" : "新增圖文選單"}
          </h2>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">
                名稱
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-accent)]"
                placeholder="例：DEREK 主選單 v1"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">
                選單圖片 (2500 x 1686 或 2500 x 843)
              </label>
              <ImageUpload value={formImageUrl} onChange={setFormImageUrl} />
            </div>

            {/* Environment */}
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">
                環境
              </label>
              <select
                value={formEnv}
                onChange={(e) => setFormEnv(e.target.value)}
                className="bg-[var(--bg-tertiary)] border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-accent)]"
              >
                <option value="production">Production</option>
                <option value="test">Test</option>
              </select>
            </div>

            {/* Layout selector */}
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">
                區域版面
              </label>
              <div className="flex gap-2">
                {(Object.keys(LAYOUTS) as LayoutType[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleLayoutChange(key)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition ${
                      formLayout === key
                        ? "bg-[var(--brand-primary)] text-white"
                        : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border-strong)]"
                    }`}
                  >
                    {LAYOUTS[key].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Area actions */}
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-2">
                區域動作設定
              </label>
              <div className="space-y-3">
                {formAreas.map((area, i) => (
                  <div
                    key={i}
                    className="bg-[var(--bg-tertiary)] rounded-lg p-3 border border-[var(--border-subtle)]"
                  >
                    <div className="text-xs text-[var(--text-muted)] mb-2 font-medium">
                      區域 {getAreaLabel(i, formLayout)}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={area.action.type}
                        onChange={(e) =>
                          updateAreaAction(i, "type", e.target.value)
                        }
                        className="bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-lg px-2 py-1.5 text-sm text-[var(--text-primary)] min-w-[120px]"
                      >
                        <option value="uri">URI 連結</option>
                        <option value="postback">Postback</option>
                        <option value="message">發送文字</option>
                        <option value="richmenuswitch">選單切換</option>
                      </select>
                      {area.action.type === "uri" && (
                        <>
                          <input
                            type="text"
                            value={area.action.uri || ""}
                            onChange={(e) =>
                              updateAreaAction(i, "uri", e.target.value)
                            }
                            placeholder="https://... 或 tel:..."
                            className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-lg px-2 py-1.5 text-sm text-[var(--text-primary)]"
                          />
                          <input
                            type="text"
                            value={area.action.label || ""}
                            onChange={(e) =>
                              updateAreaAction(i, "label", e.target.value)
                            }
                            placeholder="標籤 (選填)"
                            className="sm:w-32 bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-lg px-2 py-1.5 text-sm text-[var(--text-primary)]"
                          />
                        </>
                      )}
                      {area.action.type === "postback" && (
                        <>
                          <input
                            type="text"
                            value={area.action.data || ""}
                            onChange={(e) =>
                              updateAreaAction(i, "data", e.target.value)
                            }
                            placeholder="postback data (例: action=menu)"
                            className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-lg px-2 py-1.5 text-sm text-[var(--text-primary)]"
                          />
                          <input
                            type="text"
                            value={area.action.label || ""}
                            onChange={(e) =>
                              updateAreaAction(i, "label", e.target.value)
                            }
                            placeholder="標籤 (選填)"
                            className="sm:w-32 bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-lg px-2 py-1.5 text-sm text-[var(--text-primary)]"
                          />
                        </>
                      )}
                      {area.action.type === "message" && (
                        <input
                          type="text"
                          value={area.action.text || ""}
                          onChange={(e) =>
                            updateAreaAction(i, "text", e.target.value)
                          }
                          placeholder="發送的文字 (例: 門市)"
                          className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-lg px-2 py-1.5 text-sm text-[var(--text-primary)]"
                        />
                      )}
                      {area.action.type === "richmenuswitch" && (
                        <>
                          <input
                            type="text"
                            value={area.action.richMenuAliasId || ""}
                            onChange={(e) =>
                              updateAreaAction(i, "richMenuAliasId", e.target.value)
                            }
                            placeholder="目標別名 (例: richmenu-alias-vip)"
                            className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-lg px-2 py-1.5 text-sm text-[var(--text-primary)]"
                          />
                          <input
                            type="text"
                            value={area.action.data || ""}
                            onChange={(e) =>
                              updateAreaAction(i, "data", e.target.value)
                            }
                            placeholder="postback data"
                            className="sm:w-44 bg-[var(--bg-secondary)] border border-[var(--border-strong)] rounded-lg px-2 py-1.5 text-sm text-[var(--text-primary)]"
                          />
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form buttons */}
          <div className="flex gap-2 mt-5">
            <button
              type="submit"
              disabled={loading}
              className="bg-[var(--brand-primary)] hover:bg-[var(--text-secondary)] text-white px-4 py-2 rounded-lg text-sm font-bold transition disabled:opacity-50"
            >
              {loading
                ? "處理中..."
                : editingId
                  ? "儲存變更"
                  : "建立選單"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border-strong)] px-4 py-2 rounded-lg text-sm transition"
            >
              取消
            </button>
          </div>
        </form>
      )}

      {/* Menu list */}
      <div className="space-y-3">
        {menus.map((menu) => (
          <div
            key={menu.id}
            className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-strong)] p-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Image preview */}
              {menu.imageUrl && (
                <img
                  src={menu.imageUrl}
                  alt={menu.name}
                  className="w-full sm:w-48 h-24 object-cover rounded-lg border border-[var(--border-strong)]"
                />
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-[var(--text-primary)] font-bold">
                    {menu.name}
                  </h3>
                  {getStatusBadge(menu)}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      menu.env === "production"
                        ? "bg-blue-50 text-blue-600"
                        : "bg-orange-50 text-orange-600"
                    }`}
                  >
                    {menu.env}
                  </span>
                  {menu.pairedWith && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">
                      🔄 已配對
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {(menu.areas as Area[])?.length || 0} 個區域
                  {menu.lineMenuId && (
                    <>
                      {" "}
                      &middot; LINE ID:{" "}
                      <span className="font-mono">{menu.lineMenuId.slice(0, 12)}...</span>
                    </>
                  )}
                  {menu.aliasId && (
                    <>
                      {" "}
                      &middot; 別名:{" "}
                      <span className="font-mono text-purple-600">{menu.aliasId}</span>
                    </>
                  )}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  建立於{" "}
                  {new Date(menu.createdAt).toLocaleDateString("zh-TW")}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {!menu.lineMenuId && (
                  <button
                    onClick={() => handleDeploy(menu.id)}
                    disabled={actionLoading === menu.id}
                    className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
                  >
                    {actionLoading === menu.id ? "..." : "部署到 LINE"}
                  </button>
                )}
                {menu.lineMenuId && !menu.isDefault && (
                  <>
                    <button
                      onClick={() => handleDeploy(menu.id)}
                      disabled={actionLoading === menu.id}
                      className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
                    >
                      {actionLoading === menu.id ? "..." : "重新部署"}
                    </button>
                    <button
                      onClick={() => handleSetDefault(menu.id)}
                      disabled={actionLoading === menu.id}
                      className="bg-[var(--brand-accent)]/15 text-[var(--brand-accent)] hover:bg-[var(--brand-accent)]/25 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
                    >
                      {actionLoading === menu.id ? "..." : "設為預設"}
                    </button>
                  </>
                )}
                {menu.isDefault && menu.lineMenuId && (
                  <button
                    onClick={() => handleDeploy(menu.id)}
                    disabled={actionLoading === menu.id}
                    className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
                  >
                    {actionLoading === menu.id ? "..." : "重新部署"}
                  </button>
                )}
                <button
                  onClick={() => startEdit(menu)}
                  className="text-[var(--brand-accent)] hover:text-[var(--text-primary)] px-3 py-1.5 text-xs font-medium transition"
                >
                  編輯
                </button>
                <button
                  onClick={() => handleDelete(menu.id)}
                  disabled={actionLoading === menu.id}
                  className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
                >
                  刪除
                </button>
              </div>
            </div>
          </div>
        ))}

        {menus.length === 0 && (
          <div className="text-center py-12 text-[var(--text-muted)]">
            尚無圖文選單，請點擊上方按鈕新增
          </div>
        )}
      </div>
    </div>
  );
}
