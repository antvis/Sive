import { navigationItem } from '@renderer/components/layout/navigationStyles';
import ComposeIcon from '@renderer/components/layout/ComposeIcon';
import { useState } from 'react';
import type { Dataset } from '@shared/contracts';
import DatasetPickerDialog from '@renderer/components/data/DatasetPickerDialog';

export default function NewConversation({
  datasets,
  current,
  disabled,
  onNew,
  onAddData,
}: {
  datasets: Dataset[];
  current?: Dataset;
  disabled: boolean;
  onNew: (dataset: Dataset) => void;
  onAddData: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className={navigationItem}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (current) onNew(current);
          else {
            setOpen(true);
          }
        }}
      >
        <ComposeIcon />
        新建分析
      </button>
      {open && (
        <DatasetPickerDialog
          datasets={datasets}
          disabled={disabled}
          onSelect={onNew}
          onClose={() => setOpen(false)}
          onAddData={onAddData}
        />
      )}
    </>
  );
}
