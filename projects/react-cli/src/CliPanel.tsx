import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ICliCommandProcessor } from '@qodalis/cli-core';
import { CliEngineOptions } from '@qodalis/cli';
import { Cli } from './Cli';

export interface CliPanelOptions extends CliEngineOptions {
    isCollapsed?: boolean;
}

export interface CliPanelProps {
    options?: CliPanelOptions;
    processors?: ICliCommandProcessor[];
    style?: React.CSSProperties;
    className?: string;
}

interface TerminalPane {
    id: number;
    widthPercent: number;
}

interface TerminalTab {
    id: number;
    title: string;
    isEditing: boolean;
    panes: TerminalPane[];
}

interface TabContextMenu {
    visible: boolean;
    x: number;
    y: number;
    tabId: number;
}

const HEADER_HEIGHT = 60;
const TAB_BAR_HEIGHT = 38;
const MIN_PANE_WIDTH_PERCENT = 10;

/* ─── SVG icons ──────────────────────────────────────────── */

const TerminalIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
);

const MaximizeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 3 21 3 21 9" />
        <polyline points="9 21 3 21 3 15" />
        <line x1="21" y1="3" x2="14" y2="10" />
        <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
);

const RestoreIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 14 10 14 10 20" />
        <polyline points="20 10 14 10 14 4" />
        <line x1="14" y1="10" x2="21" y2="3" />
        <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
);

const ChevronUpIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="18 15 12 9 6 15" />
    </svg>
);

const ChevronDownIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

const CloseIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

/* ─── Component ──────────────────────────────────────────── */

export function CliPanel({ options, processors, style, className }: CliPanelProps) {
    const [visible, setVisible] = useState(true);
    const [collapsed, setCollapsed] = useState(options?.isCollapsed ?? true);
    const [maximized, setMaximized] = useState(false);
    const [panelHeight, setPanelHeight] = useState(600);
    const [initialized, setInitialized] = useState(false);

    const [tabs, setTabs] = useState<TerminalTab[]>([]);
    const [activeTabId, setActiveTabId] = useState(0);
    const [activePaneId, setActivePaneId] = useState(0);
    const nextIdRef = useRef({ tab: 1, pane: 1 });

    const [contextMenu, setContextMenu] = useState<TabContextMenu>({ visible: false, x: 0, y: 0, tabId: 0 });

    // Pane resize state
    const [paneResizing, setPaneResizing] = useState(false);
    const paneResizeRef = useRef({ tabId: 0, dividerIndex: 0, startX: 0, startWidths: [] as number[], containerWidth: 0 });

    // Panel resize state
    const [panelResizing, setPanelResizing] = useState(false);
    const panelResizeRef = useRef({ startY: 0, startHeight: 0 });
    const prevHeightRef = useRef(600);

    const terminalHeight = `${panelHeight - HEADER_HEIGHT - TAB_BAR_HEIGHT}px`;

    /* ─── Tab management ─────────────────────────────────── */

    const addTab = useCallback(() => {
        const paneId = nextIdRef.current.pane++;
        const tabId = nextIdRef.current.tab++;
        const pane: TerminalPane = { id: paneId, widthPercent: 100 };
        const tab: TerminalTab = { id: tabId, title: `Terminal ${tabId}`, isEditing: false, panes: [pane] };
        setTabs(prev => [...prev, tab]);
        setActiveTabId(tabId);
        setActivePaneId(paneId);
    }, []);

    const toggle = useCallback(() => {
        setCollapsed(prev => {
            const next = !prev;
            if (!next && !initialized) {
                setInitialized(true);
                // Add first tab
                const paneId = nextIdRef.current.pane++;
                const tabId = nextIdRef.current.tab++;
                const pane: TerminalPane = { id: paneId, widthPercent: 100 };
                const tab: TerminalTab = { id: tabId, title: `Terminal ${tabId}`, isEditing: false, panes: [pane] };
                setTabs([tab]);
                setActiveTabId(tabId);
                setActivePaneId(paneId);
            }
            return next;
        });
    }, [initialized]);

    const closeTab = useCallback((id: number) => {
        setTabs(prev => {
            const next = prev.filter(t => t.id !== id);
            if (next.length === 0) {
                setInitialized(false);
                setCollapsed(true);
                return [];
            }
            setActiveTabId(current => {
                if (current === id) {
                    const oldIdx = prev.findIndex(t => t.id === id);
                    const newIdx = Math.min(oldIdx, next.length - 1);
                    return next[newIdx].id;
                }
                return current;
            });
            return next;
        });
    }, []);

    const selectTab = useCallback((id: number) => {
        setActiveTabId(id);
        setTabs(prev => {
            const tab = prev.find(t => t.id === id);
            if (tab && tab.panes.length > 0) {
                setActivePaneId(tab.panes[0].id);
            }
            return prev;
        });
    }, []);

    /* ─── Split / close pane ─────────────────────────────── */

    const normalizePanes = (panes: TerminalPane[]) => {
        const total = panes.reduce((s, p) => s + p.widthPercent, 0);
        if (total === 0) return;
        const scale = 100 / total;
        panes.forEach(p => { p.widthPercent *= scale; });
    };

    const splitRight = useCallback((tabId?: number, afterPaneId?: number) => {
        setTabs(prev => {
            const next = prev.map(t => ({ ...t, panes: t.panes.map(p => ({ ...p })) }));
            const tab = next.find(t => t.id === (tabId ?? activeTabId));
            if (!tab) return prev;

            const targetPaneId = afterPaneId ?? activePaneId;
            const idx = tab.panes.findIndex(p => p.id === targetPaneId);
            const insertIdx = idx === -1 ? tab.panes.length : idx + 1;

            const newPaneId = nextIdRef.current.pane++;
            const newPane: TerminalPane = { id: newPaneId, widthPercent: 0 };
            tab.panes.splice(insertIdx, 0, newPane);

            const evenWidth = 100 / tab.panes.length;
            tab.panes.forEach(p => { p.widthPercent = evenWidth; });
            normalizePanes(tab.panes);

            setActivePaneId(newPaneId);
            return next;
        });
    }, [activeTabId, activePaneId]);

    const closePane = useCallback((tabId: number, paneId: number) => {
        setTabs(prev => {
            const tab = prev.find(t => t.id === tabId);
            if (!tab) return prev;

            if (tab.panes.length <= 1) {
                const next = prev.filter(t => t.id !== tabId);
                if (next.length === 0) {
                    setInitialized(false);
                    setCollapsed(true);
                    return [];
                }
                return next;
            }

            const next = prev.map(t => ({ ...t, panes: t.panes.map(p => ({ ...p })) }));
            const updatedTab = next.find(t => t.id === tabId)!;
            const idx = updatedTab.panes.findIndex(p => p.id === paneId);
            if (idx === -1) return prev;

            updatedTab.panes.splice(idx, 1);
            const totalRemaining = updatedTab.panes.reduce((s, p) => s + p.widthPercent, 0);
            if (totalRemaining > 0) {
                updatedTab.panes.forEach(p => { p.widthPercent = (p.widthPercent / totalRemaining) * 100; });
            }
            normalizePanes(updatedTab.panes);

            setActivePaneId(curr => {
                if (curr === paneId) {
                    const newIdx = Math.min(idx, updatedTab.panes.length - 1);
                    return updatedTab.panes[newIdx].id;
                }
                return curr;
            });
            return next;
        });
    }, []);

    /* ─── Rename ─────────────────────────────────────────── */

    const startRename = useCallback((tabId: number) => {
        setTabs(prev => prev.map(t => ({ ...t, isEditing: t.id === tabId })));
    }, []);

    const commitRename = useCallback((tabId: number, value: string) => {
        const trimmed = value.trim();
        setTabs(prev => prev.map(t =>
            t.id === tabId ? { ...t, title: trimmed || t.title, isEditing: false } : t,
        ));
    }, []);

    /* ─── Context menu ───────────────────────────────────── */

    const closeContextMenu = useCallback(() => {
        setContextMenu(prev => ({ ...prev, visible: false }));
    }, []);

    useEffect(() => {
        if (!contextMenu.visible) return;
        const handler = () => closeContextMenu();
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [contextMenu.visible, closeContextMenu]);

    /* ─── Panel resize ───────────────────────────────────── */

    const onPanelResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        if (collapsed) {
            toggle();
        }
        setPanelResizing(true);
        panelResizeRef.current = { startY: e.clientY, startHeight: panelHeight };
    }, [collapsed, toggle, panelHeight]);

    useEffect(() => {
        if (!panelResizing) return;
        const onMove = (e: MouseEvent) => {
            const deltaY = panelResizeRef.current.startY - e.clientY;
            let next = Math.max(100, panelResizeRef.current.startHeight + deltaY);
            if (next > window.innerHeight) next = window.innerHeight;
            setPanelHeight(next);
        };
        const onUp = () => setPanelResizing(false);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    }, [panelResizing]);

    /* ─── Pane resize ────────────────────────────────────── */

    const onPaneResizeStart = useCallback((e: React.MouseEvent, tabId: number, dividerIndex: number) => {
        e.preventDefault();
        const tab = tabs.find(t => t.id === tabId);
        if (!tab) return;
        setPaneResizing(true);
        const container = (e.target as HTMLElement).closest('.cli-panel-panes-container');
        paneResizeRef.current = {
            tabId,
            dividerIndex,
            startX: e.clientX,
            startWidths: tab.panes.map(p => p.widthPercent),
            containerWidth: container ? container.clientWidth : 1,
        };
    }, [tabs]);

    useEffect(() => {
        if (!paneResizing) return;
        const onMove = (e: MouseEvent) => {
            const ref = paneResizeRef.current;
            const deltaX = e.clientX - ref.startX;
            const deltaPct = (deltaX / ref.containerWidth) * 100;
            const i = ref.dividerIndex;

            let leftWidth = ref.startWidths[i] + deltaPct;
            let rightWidth = ref.startWidths[i + 1] - deltaPct;

            if (leftWidth < MIN_PANE_WIDTH_PERCENT) {
                leftWidth = MIN_PANE_WIDTH_PERCENT;
                rightWidth = ref.startWidths[i] + ref.startWidths[i + 1] - MIN_PANE_WIDTH_PERCENT;
            }
            if (rightWidth < MIN_PANE_WIDTH_PERCENT) {
                rightWidth = MIN_PANE_WIDTH_PERCENT;
                leftWidth = ref.startWidths[i] + ref.startWidths[i + 1] - MIN_PANE_WIDTH_PERCENT;
            }

            setTabs(prev => {
                const next = prev.map(t => ({ ...t, panes: t.panes.map(p => ({ ...p })) }));
                const tab = next.find(t => t.id === ref.tabId);
                if (tab) {
                    tab.panes[i].widthPercent = leftWidth;
                    tab.panes[i + 1].widthPercent = rightWidth;
                }
                return next;
            });
        };
        const onUp = () => {
            setPaneResizing(false);
            document.body.classList.remove('cli-pane-resizing');
        };
        document.body.classList.add('cli-pane-resizing');
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    }, [paneResizing]);

    /* ─── Maximize ───────────────────────────────────────── */

    const toggleMaximize = useCallback(() => {
        setMaximized(prev => {
            if (!prev) {
                prevHeightRef.current = panelHeight;
                setPanelHeight(window.innerHeight);
            } else {
                setPanelHeight(prevHeightRef.current);
            }
            return !prev;
        });
    }, [panelHeight]);

    /* ─── Render ─────────────────────────────────────────── */

    if (!visible) return null;

    return (
        <>
            <div
                className={`cli-panel-wrapper ${collapsed ? 'collapsed' : ''} ${maximized ? 'maximized' : ''} ${panelResizing ? 'resizing' : ''} ${className ?? ''}`}
                style={{ height: `${panelHeight}px`, ...style }}
            >
                {/* Header */}
                <div className="cli-panel-header">
                    <div className="cli-panel-resize-bar" onMouseDown={onPanelResizeStart}>
                        <div className="cli-panel-resize-grip" />
                    </div>
                    <div className="cli-panel-header-content">
                        <p className="cli-panel-title">
                            <span className="cli-panel-title-icon"><TerminalIcon /></span>
                            CLI
                        </p>
                        <div className="cli-panel-action-buttons">
                            <button className="cli-panel-btn" title={maximized ? 'Restore' : 'Maximize'} disabled={collapsed} onClick={toggleMaximize}>
                                {maximized ? <RestoreIcon /> : <MaximizeIcon />}
                            </button>
                            <button className="cli-panel-btn" title={collapsed ? 'Expand' : 'Collapse'} onClick={toggle}>
                                {collapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
                            </button>
                            <button className="cli-panel-btn" title="Close" onClick={() => setVisible(false)}>
                                <CloseIcon />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                {!collapsed && initialized && (
                    <div className="cli-panel-content">
                        {/* Tab bar */}
                        <div className="cli-panel-tabs">
                            <ul className="cli-panel-tab-list">
                                {tabs.map(tab => (
                                    <li
                                        key={tab.id}
                                        className={`cli-panel-tab ${tab.id === activeTabId ? 'active' : ''}`}
                                        onClick={() => selectTab(tab.id)}
                                        onDoubleClick={() => startRename(tab.id)}
                                        onContextMenu={e => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setContextMenu({ visible: true, x: e.clientX, y: e.clientY, tabId: tab.id });
                                        }}
                                    >
                                        {tab.isEditing ? (
                                            <input
                                                className="cli-panel-tab-rename-input"
                                                type="text"
                                                defaultValue={tab.title}
                                                autoFocus
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') commitRename(tab.id, (e.target as HTMLInputElement).value);
                                                    else if (e.key === 'Escape') setTabs(prev => prev.map(t => ({ ...t, isEditing: false })));
                                                }}
                                                onBlur={e => commitRename(tab.id, e.target.value)}
                                                onClick={e => e.stopPropagation()}
                                                onDoubleClick={e => e.stopPropagation()}
                                            />
                                        ) : (
                                            <>
                                                <span className="cli-panel-tab-title">{tab.title}</span>
                                                <button
                                                    className="cli-panel-tab-close-btn"
                                                    title="Close tab"
                                                    onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
                                                >&times;</button>
                                            </>
                                        )}
                                    </li>
                                ))}
                            </ul>
                            <button className="cli-panel-add-tab" title="New terminal" onClick={addTab}>+</button>
                        </div>

                        {/* Terminal instances */}
                        <div className="cli-panel-instances">
                            {tabs.map(tab => (
                                <div key={tab.id} className="cli-panel-instance" style={{ display: tab.id === activeTabId ? undefined : 'none' }}>
                                    <div className={`cli-panel-panes-container ${paneResizing ? 'resizing' : ''}`}>
                                        {tab.panes.map((pane, i) => (
                                            <React.Fragment key={pane.id}>
                                                {i > 0 && (
                                                    <div className="cli-panel-pane-divider" onMouseDown={e => onPaneResizeStart(e, tab.id, i - 1)}>
                                                        <div className="cli-panel-pane-divider-grip" />
                                                    </div>
                                                )}
                                                <div
                                                    className={`cli-panel-pane ${pane.id === activePaneId && tab.id === activeTabId ? 'active-pane' : ''}`}
                                                    style={{ flex: `${pane.widthPercent} 1 0` }}
                                                    onClick={() => { setActivePaneId(pane.id); setActiveTabId(tab.id); }}
                                                >
                                                    {tab.panes.length > 1 && (
                                                        <button
                                                            className="cli-panel-pane-close-btn"
                                                            onClick={e => { e.stopPropagation(); closePane(tab.id, pane.id); }}
                                                            title="Close pane"
                                                        >&times;</button>
                                                    )}
                                                    <Cli options={options} processors={processors} style={{ height: terminalHeight }} />
                                                </div>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Context menu */}
            {contextMenu.visible && (
                <div
                    className="cli-panel-context-menu"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={e => e.stopPropagation()}
                >
                    <button className="cli-panel-context-menu-item" onClick={() => { closeContextMenu(); startRename(contextMenu.tabId); }}>Rename</button>
                    <button className="cli-panel-context-menu-item" onClick={() => {
                        closeContextMenu();
                        const tab = tabs.find(t => t.id === contextMenu.tabId);
                        if (!tab) return;
                        const paneId = nextIdRef.current.pane++;
                        const tabId = nextIdRef.current.tab++;
                        const pane: TerminalPane = { id: paneId, widthPercent: 100 };
                        const newTab: TerminalTab = { id: tabId, title: `${tab.title} (copy)`, isEditing: false, panes: [pane] };
                        const idx = tabs.indexOf(tab);
                        setTabs(prev => { const next = [...prev]; next.splice(idx + 1, 0, newTab); return next; });
                        setActiveTabId(tabId);
                        setActivePaneId(paneId);
                    }}>Duplicate</button>
                    <button className="cli-panel-context-menu-item" onClick={() => { closeContextMenu(); splitRight(contextMenu.tabId); }}>Split Right</button>
                    <div className="cli-panel-context-menu-separator" />
                    <button className="cli-panel-context-menu-item" onClick={() => { closeContextMenu(); closeTab(contextMenu.tabId); }}>Close</button>
                    <button className="cli-panel-context-menu-item" disabled={tabs.length <= 1} onClick={() => { closeContextMenu(); setTabs(prev => prev.filter(t => t.id === contextMenu.tabId)); setActiveTabId(contextMenu.tabId); }}>Close Others</button>
                    <button className="cli-panel-context-menu-item" onClick={() => {
                        const id = contextMenu.tabId;
                        closeContextMenu();
                        setTabs(prev => {
                            const idx = prev.findIndex(t => t.id === id);
                            if (idx === -1) return prev;
                            return prev.slice(0, idx + 1);
                        });
                    }}>Close to the Right</button>
                    <div className="cli-panel-context-menu-separator" />
                    <button className="cli-panel-context-menu-item destructive" onClick={() => { closeContextMenu(); setTabs([]); setInitialized(false); setCollapsed(true); }}>Close All</button>
                </div>
            )}
        </>
    );
}
