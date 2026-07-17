"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Item = { id: string; text: string; done: boolean };

function SortableStep({
  item,
  onToggle,
}: {
  item: Item;
  onToggle: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-start gap-3 rounded-lg border border-card-border bg-card p-3 shadow-sm ${
        isDragging ? "opacity-75 shadow-md border-blue-500/35" : ""
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reorder step: ${item.text.slice(0, 50)}`}
        className="mt-0.5 shrink-0 cursor-grab touch-none rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
          <path d="M7 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm0 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-1 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm9-13a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-1 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm1 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
        </svg>
      </button>
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={item.done}
          onChange={() => onToggle(item.id)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-card-border text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
        />
        <span
          className={
            item.done 
              ? "text-slate-400 line-through dark:text-slate-500 transition-all" 
              : "text-slate-700 dark:text-slate-300 text-sm font-medium"
          }
        >
          {item.text}
        </span>
      </label>
    </li>
  );
}

/** Verification-steps checklist: drag (pointer OR keyboard, via dnd-kit's
 *  KeyboardSensor) to prioritise, check off as completed. */
export default function ChecklistDnd({ steps }: { steps: string[] }) {
  const initial = useMemo<Item[]>(
    () => steps.map((text, i) => ({ id: `step-${i}`, text, done: false })),
    [steps]
  );
  const [items, setItems] = useState<Item[]>(initial);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((i) => i.id === active.id);
        const newIndex = prev.findIndex((i) => i.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <SortableStep
              key={item.id}
              item={item}
              onToggle={(id) =>
                setItems((prev) =>
                  prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i))
                )
              }
            />
          ))}
        </ul>
      </SortableContext>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Drag (or focus the handle and use Space + arrow keys) to reorder steps by
        priority; tick them off as you complete them.
      </p>
    </DndContext>
  );
}
