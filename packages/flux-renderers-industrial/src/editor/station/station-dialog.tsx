import { useState } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Input, Label } from '@nop-chaos/ui';
import { useFluxTranslation } from '@nop-chaos/flux-i18n';
import type { EditorEngineRuntime } from '../renderer/hooks/use-editor-engine.js';
import { errorMessage } from '../../renderer/scada-errors.js';
import {
  createScreenMeta,
  createStation,
  EMPTY_SCREEN_DOCUMENT,
  touchScreen,
  type ScadaScreenMeta,
  type ScadaStation,
  type ScadaStationStorage,
} from './station-model.js';

export interface EditorStationDialogProps {
  runtime: EditorEngineRuntime;
  /** 宿主注入的站点/画面存储回调（design-template-station.md §5）；未注入时弹层显示未接入提示。 */
  storage?: ScadaStationStorage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  /** storage 回调失败上报（code='storage-error'）。 */
  onError?: (code: string, message: string) => void;
}

interface StationDraft {
  station: ScadaStation | null;
  /** 当前画面 id（弹层本地 state——多画面状态不入 session，design-template-station.md §4.2）。 */
  currentScreenId: string | undefined;
}

function emptyDocument(): string {
  return EMPTY_SCREEN_DOCUMENT;
}

/**
 * 站点/画面管理弹层（plan 522 / L5.4，design-template-station.md §4.2）。
 *
 * 画面 = 一个 serialization 文档；切换 = 「save 当前 working copy → runtime.load(目标文档)」
 * （既有 load 语义：替换 working copy + 清空 undo 栈，切换提示显式告知）。当前画面 id 属弹层
 * 本地 state（打开时缺省取 screens[0]），不入 session（R5）。画面操作不进 undo 栈。
 */
export function EditorStationDialog(props: EditorStationDialogProps) {
  const { runtime, storage, open, onOpenChange } = props;
  const { t } = useFluxTranslation();
  const [draft, setDraft] = useState<StationDraft>({ station: null, currentScreenId: undefined });
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [stationName, setStationName] = useState('');
  const [screenName, setScreenName] = useState('');
  const [status, setStatus] = useState('');
  // null = 首渲染未决——open=true 挂载同样触发一次 refresh（与 template-dialog 同纪律）。
  const [prevOpen, setPrevOpen] = useState<boolean | null>(null);

  function applyStation(station: ScadaStation | null): void {
    setDraft({ station, currentScreenId: station?.screens[0]?.id });
    setLoadedOnce(true);
  }

  function refresh(): Promise<void> {
    if (!storage) {
      applyStation(null);
      return Promise.resolve();
    }
    return storage
      .loadStation()
      .then(applyStation)
      .catch((error: unknown) => {
        setLoadedOnce(true);
        props.onError?.('storage-error', errorMessage(error));
      });
  }

  const persistStation = (station: ScadaStation): Promise<void> => {
    if (!storage) return Promise.resolve();
    return storage.saveStation(station).then(() => {
      setDraft({ station, currentScreenId: pickCurrent(station) });
    });
  };

  const pickCurrent = (station: ScadaStation): string | undefined => {
    const current = draft.currentScreenId;
    if (current && station.screens.some((s) => s.id === current)) return current;
    return station.screens[0]?.id;
  };

  /** 保存当前画面文档 + meta updatedAt（design-template-station.md §4.2 保存语义）。 */
  const saveCurrentScreen = async (): Promise<void> => {
    const { station, currentScreenId } = draft;
    if (!storage || !station || !currentScreenId) return;
    const serialized = runtime.exportConfig();
    await storage.saveScreen(currentScreenId, serialized);
    const screens = touchScreen(station.screens, currentScreenId);
    await persistStation({ ...station, screens });
  };

  const handleCreateStation = () => {
    if (!storage || stationName.trim() === '') return;
    const station: ScadaStation = createStation(stationName.trim());
    persistStation(station)
      .then(() => {
        setStationName('');
        setStatus(t('industrial.scada.editor.station.stationCreated'));
      })
      .catch((error: unknown) => props.onError?.('storage-error', errorMessage(error)));
  };

  const handleCreateScreen = () => {
    const { station } = draft;
    if (!storage || !station || screenName.trim() === '') return;
    const screen: ScadaScreenMeta = createScreenMeta(screenName.trim());
    const stationWithScreen: ScadaStation = { ...station, screens: [...station.screens, screen] };
    storage
      .saveScreen(screen.id, emptyDocument())
      .then(() => persistStation(stationWithScreen))
      .then(() => {
        setDraft({ station: stationWithScreen, currentScreenId: screen.id });
        setScreenName('');
        setStatus(t('industrial.scada.editor.station.screenCreated'));
      })
      .catch((error: unknown) => props.onError?.('storage-error', errorMessage(error)));
  };

  const handleSwitch = (target: ScadaScreenMeta) => {
    const { station, currentScreenId } = draft;
    if (!storage || !station || target.id === currentScreenId) return;
    const run = async (): Promise<void> => {
      // 先保存当前画面（自动，防丢编辑），再装入目标画面文档（load 清空 undo 栈——UI 提示显式告知）。
      await saveCurrentScreen();
      const serialized = await storage.loadScreen(target.id);
      runtime.load(serialized ?? emptyDocument());
      setDraft({ station, currentScreenId: target.id });
      setStatus(t('industrial.scada.editor.station.switched'));
    };
    void run().catch((error: unknown) => props.onError?.('storage-error', errorMessage(error)));
  };

  const handleDeleteScreen = (target: ScadaScreenMeta) => {
    const { station } = draft;
    if (!storage || !station) return;
    const screens = station.screens.filter((s) => s.id !== target.id);
    storage
      .deleteScreen(target.id)
      .then(() => persistStation({ ...station, screens }))
      .then(() => {
        setDraft((prev) => ({
          station: { ...station, screens },
          currentScreenId:
            prev.currentScreenId === target.id
              ? screens[0]?.id
              : prev.currentScreenId,
        }));
        setStatus(t('industrial.scada.editor.station.screenDeleted'));
      })
      .catch((error: unknown) => props.onError?.('storage-error', errorMessage(error)));
  };

  // open 翻转 → 重置 draft + 拉取存储（置于全部声明之后：vite/react-compiler 转换下函数声明不保证
  // 提升，先调用后声明会触发 TDZ——e2e 实测「Cannot access 'applyStation' before initialization」）。
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setStationName('');
      setScreenName('');
      setStatus('');
      void refresh();
    }
  }

  const { station, currentScreenId } = draft;
  const currentScreen = station?.screens.find((s) => s.id === currentScreenId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="nop-scada-editor-toolbox-station" data-slot="scada-editor-toolbox-station">
        <DialogHeader>
          <DialogTitle>{t('industrial.scada.editor.station.title')}</DialogTitle>
          <DialogDescription>{t('industrial.scada.editor.station.description')}</DialogDescription>
        </DialogHeader>
        {!storage ? (
          <div className="text-xs opacity-60 py-2" data-testid="toolbox-station-unwired">
            {t('industrial.scada.editor.station.unwired')}
          </div>
        ) : !loadedOnce ? null : !station ? (
          <div className="flex items-end gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs" htmlFor="toolbox-station-name">
                {t('industrial.scada.editor.station.stationName')}
              </Label>
              <Input
                id="toolbox-station-name"
                className="text-xs"
                value={stationName}
                disabled={props.disabled}
                placeholder={t('industrial.scada.editor.station.stationNamePlaceholder')}
                data-testid="toolbox-station-name"
                onChange={(e) => setStationName(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              className="text-xs"
              disabled={props.disabled || stationName.trim() === ''}
              data-testid="toolbox-station-create"
              onClick={handleCreateStation}
            >
              {t('industrial.scada.editor.station.createStation')}
            </Button>
          </div>
        ) : (
          <>
            <div className="text-xs opacity-70" data-testid="toolbox-station-current">
              {t('industrial.scada.editor.station.current')}:{' '}
              <span className="font-mono">{currentScreen?.name ?? '-'}</span>
              <span className="opacity-60"> · {station.name}</span>
            </div>
            {station.screens.length === 0 ? (
              <div className="text-xs opacity-60 py-2" data-testid="toolbox-station-empty">
                {t('industrial.scada.editor.station.empty')}
              </div>
            ) : (
              <ul className="flex flex-col gap-1 max-h-72 overflow-auto m-0 p-0 list-none">
                {station.screens.map((screen) => (
                  <li
                    key={screen.id}
                    className="flex items-center gap-2 text-xs py-1"
                    data-slot="scada-editor-station-row"
                    data-testid="toolbox-station-row"
                    data-current={screen.id === currentScreenId ? 'true' : 'false'}
                  >
                    <span className="font-mono opacity-80">{screen.name}</span>
                    <span className="flex-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={props.disabled || screen.id === currentScreenId}
                      data-testid="toolbox-station-switch"
                      title={t('industrial.scada.editor.station.switchHint')}
                      onClick={() => handleSwitch(screen)}
                    >
                      {t('industrial.scada.editor.station.switchTo')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={props.disabled || screen.id !== currentScreenId}
                      data-testid="toolbox-station-save"
                      onClick={() => {
                        void saveCurrentScreen()
                          .then(() => setStatus(t('industrial.scada.editor.station.saved')))
                          .catch((error: unknown) => props.onError?.('storage-error', errorMessage(error)));
                      }}
                    >
                      {t('industrial.scada.editor.station.saveCurrent')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={props.disabled}
                      data-testid="toolbox-station-delete"
                      onClick={() => handleDeleteScreen(screen)}
                    >
                      {t('industrial.scada.editor.station.delete')}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-end gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs" htmlFor="toolbox-station-screen-name">
                  {t('industrial.scada.editor.station.screenName')}
                </Label>
                <Input
                  id="toolbox-station-screen-name"
                  className="text-xs"
                  value={screenName}
                  disabled={props.disabled}
                  placeholder={t('industrial.scada.editor.station.screenNamePlaceholder')}
                  data-testid="toolbox-station-screen-name"
                  onChange={(e) => setScreenName(e.target.value)}
                />
              </div>
              <Button
                size="sm"
                className="text-xs"
                disabled={props.disabled || screenName.trim() === ''}
                data-testid="toolbox-station-add-screen"
                onClick={handleCreateScreen}
              >
                {t('industrial.scada.editor.station.newScreen')}
              </Button>
            </div>
          </>
        )}
        <div className="flex items-center justify-between">
          <span className="nop-scada-editor-toolbox-status" data-testid="toolbox-station-status" role="status">
            {status}
          </span>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} data-testid="toolbox-station-close">
            {t('industrial.scada.editor.station.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
