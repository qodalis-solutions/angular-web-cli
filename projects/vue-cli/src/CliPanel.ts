import { defineComponent, ref, computed, PropType, h, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { ICliCommandProcessor } from '@qodalis/cli-core';
import { CliEngineOptions } from '@qodalis/cli';
import { Cli } from './Cli';

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

function normalizePanes(panes: TerminalPane[]) {
    const total = panes.reduce((s, p) => s + p.widthPercent, 0);
    if (total === 0) return;
    const scale = 100 / total;
    panes.forEach(p => { p.widthPercent *= scale; });
}

/* ─── SVG helpers ────────────────────────────────────────── */

const svgAttrs = { width: '20', height: '20', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };

const terminalIcon = () => h('svg', { ...svgAttrs, width: '22', height: '22', 'stroke-width': '2' }, [
    h('polyline', { points: '4 17 10 11 4 5' }),
    h('line', { x1: '12', y1: '19', x2: '20', y2: '19' }),
]);
const maximizeIcon = () => h('svg', svgAttrs, [
    h('polyline', { points: '15 3 21 3 21 9' }),
    h('polyline', { points: '9 21 3 21 3 15' }),
    h('line', { x1: '21', y1: '3', x2: '14', y2: '10' }),
    h('line', { x1: '3', y1: '21', x2: '10', y2: '14' }),
]);
const restoreIcon = () => h('svg', svgAttrs, [
    h('polyline', { points: '4 14 10 14 10 20' }),
    h('polyline', { points: '20 10 14 10 14 4' }),
    h('line', { x1: '14', y1: '10', x2: '21', y2: '3' }),
    h('line', { x1: '3', y1: '21', x2: '10', y2: '14' }),
]);
const chevronUp = () => h('svg', svgAttrs, [h('polyline', { points: '18 15 12 9 6 15' })]);
const chevronDown = () => h('svg', svgAttrs, [h('polyline', { points: '6 9 12 15 18 9' })]);
const closeIcon = () => h('svg', svgAttrs, [
    h('line', { x1: '18', y1: '6', x2: '6', y2: '18' }),
    h('line', { x1: '6', y1: '6', x2: '18', y2: '18' }),
]);

/* ─── Component ──────────────────────────────────────────── */

export const CliPanel = defineComponent({
    name: 'CliPanel',
    props: {
        options: { type: Object as PropType<CliEngineOptions & { isCollapsed?: boolean }>, default: undefined },
        processors: { type: Array as PropType<ICliCommandProcessor[]>, default: undefined },
        services: { type: Object as PropType<Record<string, any>>, default: undefined },
        style: { type: Object as PropType<Record<string, string>>, default: undefined },
        class: { type: String, default: undefined },
    },
    setup(props) {
        const visible = ref(true);
        const collapsed = ref(props.options?.isCollapsed ?? true);
        const maximized = ref(false);
        const panelHeight = ref(600);
        const prevHeight = ref(600);
        const initialized = ref(false);

        const tabs = ref<TerminalTab[]>([]);
        const activeTabId = ref(0);
        const activePaneId = ref(0);
        let nextTabId = 1;
        let nextPaneId = 1;

        const contextMenu = ref<TabContextMenu>({ visible: false, x: 0, y: 0, tabId: 0 });

        const paneResizing = ref(false);
        let paneResizeState = { tabId: 0, dividerIndex: 0, startX: 0, startWidths: [] as number[], containerWidth: 0 };

        const panelResizing = ref(false);
        let panelResizeState = { startY: 0, startHeight: 0 };

        const terminalHeight = computed(() => `${panelHeight.value - HEADER_HEIGHT - TAB_BAR_HEIGHT}px`);

        /* ─── Tab management ─────────────────────────────── */

        function addTab() {
            const paneId = nextPaneId++;
            const tabId = nextTabId++;
            const pane: TerminalPane = { id: paneId, widthPercent: 100 };
            const tab: TerminalTab = { id: tabId, title: `Terminal ${tabId}`, isEditing: false, panes: [pane] };
            tabs.value.push(tab);
            activeTabId.value = tabId;
            activePaneId.value = paneId;
        }

        function toggle() {
            collapsed.value = !collapsed.value;
            if (!collapsed.value && !initialized.value) {
                initialized.value = true;
                addTab();
            }
        }

        function closeTab(id: number) {
            const idx = tabs.value.findIndex(t => t.id === id);
            if (idx === -1) return;
            tabs.value.splice(idx, 1);
            if (tabs.value.length === 0) {
                initialized.value = false;
                collapsed.value = true;
                return;
            }
            if (activeTabId.value === id) {
                const newIdx = Math.min(idx, tabs.value.length - 1);
                selectTab(tabs.value[newIdx].id);
            }
        }

        function selectTab(id: number) {
            activeTabId.value = id;
            const tab = tabs.value.find(t => t.id === id);
            if (tab && tab.panes.length > 0) {
                activePaneId.value = tab.panes[0].id;
            }
        }

        /* ─── Split / close pane ─────────────────────────── */

        function splitRight(tabId?: number) {
            const tab = tabs.value.find(t => t.id === (tabId ?? activeTabId.value));
            if (!tab) return;
            const idx = tab.panes.findIndex(p => p.id === activePaneId.value);
            const insertIdx = idx === -1 ? tab.panes.length : idx + 1;
            const newPaneId = nextPaneId++;
            tab.panes.splice(insertIdx, 0, { id: newPaneId, widthPercent: 0 });
            const evenWidth = 100 / tab.panes.length;
            tab.panes.forEach(p => { p.widthPercent = evenWidth; });
            normalizePanes(tab.panes);
            activePaneId.value = newPaneId;
        }

        function closePane(tabId: number, paneId: number) {
            const tab = tabs.value.find(t => t.id === tabId);
            if (!tab) return;
            if (tab.panes.length <= 1) { closeTab(tabId); return; }
            const idx = tab.panes.findIndex(p => p.id === paneId);
            if (idx === -1) return;
            tab.panes.splice(idx, 1);
            const total = tab.panes.reduce((s, p) => s + p.widthPercent, 0);
            if (total > 0) tab.panes.forEach(p => { p.widthPercent = (p.widthPercent / total) * 100; });
            normalizePanes(tab.panes);
            if (activePaneId.value === paneId) {
                activePaneId.value = tab.panes[Math.min(idx, tab.panes.length - 1)].id;
            }
        }

        /* ─── Rename ─────────────────────────────────────── */

        function startRename(tabId: number) {
            tabs.value.forEach(t => { t.isEditing = t.id === tabId; });
            nextTick(() => {
                const input = document.querySelector('.cli-panel-tab-rename-input') as HTMLInputElement | null;
                if (input) { input.focus(); input.select(); }
            });
        }

        function commitRename(tabId: number, value: string) {
            const trimmed = value.trim();
            const tab = tabs.value.find(t => t.id === tabId);
            if (tab) {
                if (trimmed) tab.title = trimmed;
                tab.isEditing = false;
            }
        }

        /* ─── Context menu ───────────────────────────────── */

        function closeContextMenu() { contextMenu.value = { ...contextMenu.value, visible: false }; }

        function onDocClick() { if (contextMenu.value.visible) closeContextMenu(); }
        onMounted(() => document.addEventListener('click', onDocClick));
        onBeforeUnmount(() => document.removeEventListener('click', onDocClick));

        /* ─── Panel resize ───────────────────────────────── */

        function onPanelResizeStart(e: MouseEvent) {
            e.preventDefault();
            if (collapsed.value) toggle();
            panelResizing.value = true;
            panelResizeState = { startY: e.clientY, startHeight: panelHeight.value };
        }

        function onPanelResizeMove(e: MouseEvent) {
            if (!panelResizing.value) return;
            const deltaY = panelResizeState.startY - e.clientY;
            let next = Math.max(100, panelResizeState.startHeight + deltaY);
            if (next > window.innerHeight) next = window.innerHeight;
            panelHeight.value = next;
        }

        function onPanelResizeEnd() { panelResizing.value = false; }

        onMounted(() => { document.addEventListener('mousemove', onPanelResizeMove); document.addEventListener('mouseup', onPanelResizeEnd); });
        onBeforeUnmount(() => { document.removeEventListener('mousemove', onPanelResizeMove); document.removeEventListener('mouseup', onPanelResizeEnd); });

        /* ─── Pane resize ────────────────────────────────── */

        function onPaneResizeStart(e: MouseEvent, tabId: number, dividerIndex: number) {
            e.preventDefault();
            const tab = tabs.value.find(t => t.id === tabId);
            if (!tab) return;
            paneResizing.value = true;
            const container = (e.target as HTMLElement).closest('.cli-panel-panes-container');
            paneResizeState = { tabId, dividerIndex, startX: e.clientX, startWidths: tab.panes.map(p => p.widthPercent), containerWidth: container ? container.clientWidth : 1 };
            document.body.classList.add('cli-pane-resizing');
        }

        function onPaneResizeMove(e: MouseEvent) {
            if (!paneResizing.value) return;
            const s = paneResizeState;
            const deltaPct = ((e.clientX - s.startX) / s.containerWidth) * 100;
            const i = s.dividerIndex;
            let leftW = s.startWidths[i] + deltaPct;
            let rightW = s.startWidths[i + 1] - deltaPct;
            if (leftW < MIN_PANE_WIDTH_PERCENT) { leftW = MIN_PANE_WIDTH_PERCENT; rightW = s.startWidths[i] + s.startWidths[i + 1] - MIN_PANE_WIDTH_PERCENT; }
            if (rightW < MIN_PANE_WIDTH_PERCENT) { rightW = MIN_PANE_WIDTH_PERCENT; leftW = s.startWidths[i] + s.startWidths[i + 1] - MIN_PANE_WIDTH_PERCENT; }
            const tab = tabs.value.find(t => t.id === s.tabId);
            if (tab) { tab.panes[i].widthPercent = leftW; tab.panes[i + 1].widthPercent = rightW; }
        }

        function onPaneResizeEnd() {
            if (!paneResizing.value) return;
            paneResizing.value = false;
            document.body.classList.remove('cli-pane-resizing');
        }

        onMounted(() => { document.addEventListener('mousemove', onPaneResizeMove); document.addEventListener('mouseup', onPaneResizeEnd); });
        onBeforeUnmount(() => { document.removeEventListener('mousemove', onPaneResizeMove); document.removeEventListener('mouseup', onPaneResizeEnd); });

        /* ─── Maximize ───────────────────────────────────── */

        function toggleMaximize() {
            if (!maximized.value) { prevHeight.value = panelHeight.value; panelHeight.value = window.innerHeight; }
            else { panelHeight.value = prevHeight.value; }
            maximized.value = !maximized.value;
        }

        /* ─── Render ─────────────────────────────────────── */

        return () => {
            if (!visible.value) return null;

            const wrapperClass = ['cli-panel-wrapper', collapsed.value && 'collapsed', maximized.value && 'maximized', panelResizing.value && 'resizing', props.class].filter(Boolean).join(' ');

            const headerEl = h('div', { class: 'cli-panel-header' }, [
                h('div', { class: 'cli-panel-resize-bar', onMousedown: onPanelResizeStart }, [
                    h('div', { class: 'cli-panel-resize-grip' }),
                ]),
                h('div', { class: 'cli-panel-header-content' }, [
                    h('p', { class: 'cli-panel-title' }, [
                        h('span', { class: 'cli-panel-title-icon' }, [terminalIcon()]),
                        'CLI',
                    ]),
                    h('div', { class: 'cli-panel-action-buttons' }, [
                        h('button', { class: 'cli-panel-btn', title: maximized.value ? 'Restore' : 'Maximize', disabled: collapsed.value, onClick: toggleMaximize }, [maximized.value ? restoreIcon() : maximizeIcon()]),
                        h('button', { class: 'cli-panel-btn', title: collapsed.value ? 'Expand' : 'Collapse', onClick: toggle }, [collapsed.value ? chevronUp() : chevronDown()]),
                        h('button', { class: 'cli-panel-btn', title: 'Close', onClick: () => { visible.value = false; } }, [closeIcon()]),
                    ]),
                ]),
            ]);

            const contentEl = (!collapsed.value && initialized.value) ? h('div', { class: 'cli-panel-content' }, [
                // Tab bar
                h('div', { class: 'cli-panel-tabs' }, [
                    h('ul', { class: 'cli-panel-tab-list' },
                        tabs.value.map(tab => h('li', {
                            key: tab.id,
                            class: ['cli-panel-tab', tab.id === activeTabId.value && 'active'].filter(Boolean).join(' '),
                            onClick: () => selectTab(tab.id),
                            onDblclick: () => startRename(tab.id),
                            onContextmenu: (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); contextMenu.value = { visible: true, x: e.clientX, y: e.clientY, tabId: tab.id }; },
                        }, tab.isEditing
                            ? [h('input', {
                                class: 'cli-panel-tab-rename-input', type: 'text', value: tab.title,
                                onKeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') commitRename(tab.id, (e.target as HTMLInputElement).value); else if (e.key === 'Escape') { tab.isEditing = false; } },
                                onBlur: (e: FocusEvent) => commitRename(tab.id, (e.target as HTMLInputElement).value),
                                onClick: (e: MouseEvent) => e.stopPropagation(),
                                onDblclick: (e: MouseEvent) => e.stopPropagation(),
                            })]
                            : [
                                h('span', { class: 'cli-panel-tab-title' }, tab.title),
                                h('button', { class: 'cli-panel-tab-close-btn', title: 'Close tab', onClick: (e: MouseEvent) => { e.stopPropagation(); closeTab(tab.id); } }, '\u00d7'),
                            ],
                        )),
                    ),
                    h('button', { class: 'cli-panel-add-tab', title: 'New terminal', onClick: addTab }, '+'),
                ]),
                // Terminal instances
                h('div', { class: 'cli-panel-instances' },
                    tabs.value.map(tab => h('div', {
                        key: tab.id,
                        class: 'cli-panel-instance',
                        style: { display: tab.id === activeTabId.value ? undefined : 'none' },
                    }, [
                        h('div', { class: ['cli-panel-panes-container', paneResizing.value && 'resizing'].filter(Boolean).join(' ') },
                            tab.panes.flatMap((pane, i) => {
                                const nodes: any[] = [];
                                if (i > 0) {
                                    nodes.push(h('div', { class: 'cli-panel-pane-divider', onMousedown: (e: MouseEvent) => onPaneResizeStart(e, tab.id, i - 1) }, [
                                        h('div', { class: 'cli-panel-pane-divider-grip' }),
                                    ]));
                                }
                                nodes.push(h('div', {
                                    class: ['cli-panel-pane', (pane.id === activePaneId.value && tab.id === activeTabId.value) && 'active-pane'].filter(Boolean).join(' '),
                                    style: { flex: `${pane.widthPercent} 1 0` },
                                    onClick: () => { activePaneId.value = pane.id; activeTabId.value = tab.id; },
                                }, [
                                    tab.panes.length > 1 ? h('button', {
                                        class: 'cli-panel-pane-close-btn', title: 'Close pane',
                                        onClick: (e: MouseEvent) => { e.stopPropagation(); closePane(tab.id, pane.id); },
                                    }, '\u00d7') : null,
                                    h(Cli, { options: props.options, processors: props.processors, services: props.services, style: { height: terminalHeight.value } }),
                                ]));
                                return nodes;
                            }),
                        ),
                    ])),
                ),
            ]) : null;

            const contextMenuEl = contextMenu.value.visible ? h('div', {
                class: 'cli-panel-context-menu',
                style: { left: `${contextMenu.value.x}px`, top: `${contextMenu.value.y}px` },
                onClick: (e: MouseEvent) => e.stopPropagation(),
            }, [
                h('button', { class: 'cli-panel-context-menu-item', onClick: () => { closeContextMenu(); startRename(contextMenu.value.tabId); } }, 'Rename'),
                h('button', { class: 'cli-panel-context-menu-item', onClick: () => {
                    const tab = tabs.value.find(t => t.id === contextMenu.value.tabId);
                    closeContextMenu();
                    if (!tab) return;
                    const paneId = nextPaneId++;
                    const tabId = nextTabId++;
                    const idx = tabs.value.indexOf(tab);
                    tabs.value.splice(idx + 1, 0, { id: tabId, title: `${tab.title} (copy)`, isEditing: false, panes: [{ id: paneId, widthPercent: 100 }] });
                    activeTabId.value = tabId; activePaneId.value = paneId;
                } }, 'Duplicate'),
                h('button', { class: 'cli-panel-context-menu-item', onClick: () => { closeContextMenu(); splitRight(contextMenu.value.tabId); } }, 'Split Right'),
                h('div', { class: 'cli-panel-context-menu-separator' }),
                h('button', { class: 'cli-panel-context-menu-item', onClick: () => { closeContextMenu(); closeTab(contextMenu.value.tabId); } }, 'Close'),
                h('button', { class: 'cli-panel-context-menu-item', disabled: tabs.value.length <= 1, onClick: () => { const id = contextMenu.value.tabId; closeContextMenu(); tabs.value = tabs.value.filter(t => t.id === id); activeTabId.value = id; } }, 'Close Others'),
                h('button', { class: 'cli-panel-context-menu-item', onClick: () => { const id = contextMenu.value.tabId; closeContextMenu(); const idx = tabs.value.findIndex(t => t.id === id); if (idx !== -1) tabs.value = tabs.value.slice(0, idx + 1); } }, 'Close to the Right'),
                h('div', { class: 'cli-panel-context-menu-separator' }),
                h('button', { class: 'cli-panel-context-menu-item destructive', onClick: () => { closeContextMenu(); tabs.value = []; initialized.value = false; collapsed.value = true; } }, 'Close All'),
            ]) : null;

            return h('div', {}, [
                h('div', { class: wrapperClass, style: { height: `${panelHeight.value}px`, ...props.style } }, [headerEl, contentEl]),
                contextMenuEl,
            ]);
        };
    },
});
