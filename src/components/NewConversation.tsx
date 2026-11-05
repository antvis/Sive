import { navigationItem } from './navigation-styles';
import ComposeIcon from './ComposeIcon';
import { useState } from 'react';
import type { Dataset } from '../../shared/contracts';
import DatasetPickerDialog from './DatasetPickerDialog';

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
        新建会话
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
