/** An item on a day timeline, in minutes from the start of the day. */
export type TimelineItem = { key: string; start: number; end: number };

export type TimelinePlacement = {
  key: string;
  start: number;
  end: number;
  /** Zero-based column within its group of overlapping items. */
  column: number;
  /** How many columns its group of overlapping items needs. */
  columns: number;
};

/**
 * Places items side by side where they overlap, like most calendar apps: items that overlap
 * (directly or through a chain) form a group, each item takes the first free column, and
 * every item in a group shares the group's column count so widths line up.
 */
export function layoutTimeline(items: readonly TimelineItem[]): TimelinePlacement[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const placements: TimelinePlacement[] = [];
  let group: TimelinePlacement[] = [];
  let columnEnds: number[] = [];
  let groupEnd = -Infinity;

  const closeGroup = () => {
    for (const placement of group) placement.columns = columnEnds.length;
    placements.push(...group);
    group = [];
    columnEnds = [];
  };

  for (const item of sorted) {
    // Zero-length items still take a sliver of space so they can't stack invisibly.
    const end = Math.max(item.end, item.start + 1);
    if (item.start >= groupEnd) closeGroup();
    let column = columnEnds.findIndex((columnEnd) => columnEnd <= item.start);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(end);
    } else {
      columnEnds[column] = end;
    }
    group.push({ key: item.key, start: item.start, end: item.end, column, columns: 0 });
    groupEnd = Math.max(groupEnd, end);
  }
  closeGroup();
  return placements;
}
