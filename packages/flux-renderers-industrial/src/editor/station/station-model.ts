/**
 * 站点/画面管理域核心（plan 522 / L5.4，design-template-station.md §2.2/§3.3）。
 *
 * 站点 = 画面集合的宿主持久化契约；画面 = 一个 serialization 文档（serializedConfig 字符串，格式零新增）。
 * 包内只提供模型 + 内存 store；落盘（服务端/localStorage/文件）归宿主经 storage 回调实现。
 */

export interface ScadaScreenMeta {
  id: string;
  name: string;
  /** 最近保存时间戳（保存当前画面时更新）。 */
  updatedAt: number;
}

export interface ScadaStation {
  id: string;
  name: string;
  /** 画面元数据集（有序；文档体经 loadScreen/saveScreen 分离存取）。 */
  screens: ScadaScreenMeta[];
}

/** 宿主持久化回调契约（design-template-station.md §2.2）。 */
export interface ScadaStationStorage {
  /** 站点不存在返回 null（UI 引导新建）。 */
  loadStation(): Promise<ScadaStation | null>;
  /** 站点元数据整体保存（screens 增删改）。 */
  saveStation(station: ScadaStation): Promise<void>;
  /** 画面文档 = serializedConfig 字符串（serialization 原样）；从未保存返回 null。 */
  loadScreen(screenId: string): Promise<string | null>;
  saveScreen(screenId: string, serializedConfig: string): Promise<void>;
  deleteScreen(screenId: string): Promise<void>;
}

/**
 * 内存站点/画面 store（design-template-station.md §3.3）：Map 承载 + Promise 化回调。
 * 非持久化（demo / 单测 / e2e 用），不替代宿主存储。
 */
export function createInMemoryStationStorage(): ScadaStationStorage & {
  clear(): void;
} {
  let station: ScadaStation | null = null;
  const screens = new Map<string, string>();
  let nextStationId = 1;
  let nextScreenId = 1;
  const impl: ScadaStationStorage & { clear(): void; nextScreenIdValue(): string } = {
    async loadStation() {
      return station ? { ...station, screens: station.screens.map((s) => ({ ...s })) } : null;
    },
    async saveStation(next) {
      station = { ...next, screens: next.screens.map((s) => ({ ...s })) };
    },
    async loadScreen(screenId) {
      return screens.get(screenId) ?? null;
    },
    async saveScreen(screenId, serializedConfig) {
      screens.set(screenId, serializedConfig);
    },
    async deleteScreen(screenId) {
      screens.delete(screenId);
    },
    clear() {
      station = null;
      screens.clear();
      nextStationId = 1;
      nextScreenId = 1;
    },
    nextScreenIdValue() {
      return `scr-${nextScreenId++}`;
    },
  };
  void nextStationId;
  return impl;
}

/**
 * 信封工厂（id/updatedAt 生成收敛到域核心模块——react-hooks/purity 禁止组件体内
 * Date.now/Math.random，design-template-station.md §2.2 信封字段）。
 */
export function createStation(name: string): ScadaStation {
  return { id: `station-${Date.now()}`, name, screens: [] };
}

export function createScreenMeta(name: string): ScadaScreenMeta {
  return { id: `scr-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, name, updatedAt: Date.now() };
}

/** 返回 screens 中指定画面 touch updatedAt 后的新数组（其余原样）。 */
export function touchScreen(screens: ScadaScreenMeta[], screenId: string): ScadaScreenMeta[] {
  return screens.map((s) => (s.id === screenId ? { ...s, updatedAt: Date.now() } : s));
}

/** 空画面文档（切换到从未保存的画面时装入；serialization 契约内合法值）。 */
export const EMPTY_SCREEN_DOCUMENT = JSON.stringify({ version: 1, variables: [], symbols: [] });
