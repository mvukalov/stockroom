import { useRef, useState } from 'react';

import type { MovementListItem, MovementsQuery } from '@stockroom/contract';

import { Button } from '../../components/atoms/Button/Button';
import { VirtualTable } from '../../components/organisms/VirtualTable/VirtualTable';
import { MOVEMENTS_MIN_WIDTH, movementColumns } from './movementColumns';
import { MOVEMENT_USERS } from './movementsFixtures';

/*
 * Measurement harness for docs/performance/movements-virtualization.md. Story only,
 * never part of the product UI. It renders the same loaded rows with and without
 * virtualization and records, in the page and on `window.__movementsMeasurement`:
 *
 * - mount: time from the Mount click to the second animation frame after the commit,
 *   i.e. to the first painted frame. React's production build does not call
 *   `<Profiler onRender>`, so `performance.mark` is used instead.
 * - nodes: elements inside the list after mount.
 * - scroll: a scripted scroll of SCROLL_FRAMES animation frames, SCROLL_STEP_PX each,
 *   with the duration of every frame between them.
 */

const SCROLL_FRAMES = 300;
const SCROLL_STEP_PX = 120;
/** One frame at 60 Hz. A frame over 1.5 of these missed at least one vsync. */
const FRAME_MS = 1000 / 60;
const LONG_FRAME_MS = 50;

export type MountResult = { mountMs: number; nodes: number };

export type ScrollResult = {
  frames: number;
  /** Frames longer than 1.5 × 16.7 ms: at least one vsync missed. */
  missedFrames: number;
  /** Frames longer than 50 ms. */
  longFrames: number;
  p95FrameMs: number;
  maxFrameMs: number;
};

declare global {
  interface Window {
    __movementsMeasurement?: Partial<MountResult & ScrollResult>;
  }
}

const round = (value: number) => Math.round(value * 10) / 10;

function scrollResult(durations: readonly number[]): ScrollResult {
  const sorted = [...durations].sort((a, b) => a - b);
  const p95 =
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  return {
    frames: durations.length,
    missedFrames: durations.filter((d) => d > FRAME_MS * 1.5).length,
    longFrames: durations.filter((d) => d > LONG_FRAME_MS).length,
    p95FrameMs: round(p95 ?? 0),
    maxFrameMs: round(sorted.at(-1) ?? 0),
  };
}

const nextFrame = () =>
  new Promise<number>((resolve) => requestAnimationFrame(resolve));

type MovementsMeasurementProps = {
  rows: readonly MovementListItem[];
  /** `false` renders every row: the baseline. */
  virtualize: boolean;
};

const SORT: MovementsQuery['sort'] = '-createdAt';
const userNames = new Map(MOVEMENT_USERS.map((u) => [u.id, u.name]));
const COLUMNS = movementColumns({
  userName: (id) => userNames.get(id),
  onCopyId: () => {},
  copiedId: undefined,
  savingIds: new Set(),
});

export function MovementsMeasurement({
  rows,
  virtualize,
}: MovementsMeasurementProps) {
  const [mounted, setMounted] = useState(false);
  const [mount, setMount] = useState<MountResult | null>(null);
  const [scroll, setScroll] = useState<ScrollResult | null>(null);
  const [running, setRunning] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const startMount = () => {
    performance.clearMarks();
    performance.mark('mount-start');
    setMounted(true);
    // The commit runs before the first frame; the second frame callback runs after
    // that frame has been painted.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        performance.mark('mount-painted');
        const { duration } = performance.measure(
          'mount',
          'mount-start',
          'mount-painted',
        );
        const nodes = listRef.current?.querySelectorAll('*').length ?? 0;
        const result = { mountMs: round(duration), nodes };
        window.__movementsMeasurement = { ...result };
        setMount(result);
      }),
    );
  };

  const startScroll = async () => {
    const container = listRef.current?.querySelector<HTMLElement>(
      '[data-scroll-container]',
    );
    if (!container) return;
    setRunning(true);
    const durations: number[] = [];
    let last = await nextFrame();
    for (let frame = 0; frame < SCROLL_FRAMES; frame += 1) {
      container.scrollTop += SCROLL_STEP_PX;
      const now = await nextFrame();
      durations.push(now - last);
      last = now;
    }
    const result = scrollResult(durations);
    window.__movementsMeasurement = {
      ...window.__movementsMeasurement,
      ...result,
    };
    setScroll(result);
    setRunning(false);
  };

  return (
    <div>
      <p>
        {rows.length.toLocaleString('en-GB')} rows,{' '}
        {virtualize ? 'virtualized' : 'not virtualized'}.
      </p>
      <p>
        <Button onClick={startMount} disabled={mounted}>
          Mount
        </Button>{' '}
        <Button
          onClick={() => void startScroll()}
          disabled={mount === null || running}
        >
          Scroll
        </Button>
      </p>
      <dl data-testid="results">
        <dt>Mount to first paint (ms)</dt>
        <dd data-result="mountMs">{mount?.mountMs ?? '–'}</dd>
        <dt>Elements in the list</dt>
        <dd data-result="nodes">{mount?.nodes ?? '–'}</dd>
        <dt>Scroll frames over 25 ms / over 50 ms</dt>
        <dd data-result="frames">
          {scroll === null
            ? '–'
            : `${scroll.missedFrames} / ${scroll.longFrames} of ${scroll.frames}`}
        </dd>
        <dt>Scroll frame p95 / max (ms)</dt>
        <dd data-result="p95">
          {scroll === null
            ? '–'
            : `${scroll.p95FrameMs} / ${scroll.maxFrameMs}`}
        </dd>
      </dl>
      <div ref={listRef}>
        {mounted && (
          <VirtualTable
            columns={COLUMNS}
            rows={rows}
            total={rows.length}
            getRowId={(movement) => movement.id}
            caption="Stock movements"
            minWidth={MOVEMENTS_MIN_WIDTH}
            sort={SORT}
            onSortChange={() => {}}
            hasMore={false}
            isLoadingMore={false}
            onLoadMore={() => {}}
            resetKey="measurement"
            endLabel="End of history"
            empty={null}
            virtualize={virtualize}
          />
        )}
      </div>
    </div>
  );
}
