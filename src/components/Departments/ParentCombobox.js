import { useEffect, useId, useRef, useState } from 'react';
import { DEPARTMENT_TYPE_LABELS } from '../../services/constants';
import { searchDepartments } from '../../services/departments';

const DEBOUNCE_MS = 300;

export default function ParentCombobox({
  id,
  value,
  onChange,
  disabled = false,
  placeholder = 'Начните вводить название',
  error,
}) {
  const listboxId = useId();
  const errorId = useId();
  const containerRef = useRef(null);
  const [query, setQuery] = useState(value ? value.name : '');
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (value) {
      setQuery(value.name);
    }
  }, [value]);

  useEffect(() => {
    if (disabled) {
      setQuery('');
      setOpen(false);
      setOptions([]);
      setSearchError(null);
      setHighlightedIndex(-1);
    }
  }, [disabled]);

  useEffect(() => {
    if (!open || disabled) {
      return undefined;
    }

    const controller = new AbortController();
    const delay = query.trim() ? DEBOUNCE_MS : 0;
    const timer = setTimeout(async () => {
      setLoading(true);
      setSearchError(null);

      try {
        const results = await searchDepartments(query.trim(), {
          signal: controller.signal,
        });

        if (controller.signal.aborted) {
          return;
        }

        setOptions(results);
        setHighlightedIndex(results.length > 0 ? 0 : -1);
      } catch (requestError) {
        if (controller.signal.aborted || requestError.name === 'AbortError') {
          return;
        }

        setOptions([]);
        setHighlightedIndex(-1);
        setSearchError(requestError.message);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, delay);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [disabled, open, query, reloadToken]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  const handleInputChange = (event) => {
    const nextQuery = event.target.value;
    setQuery(nextQuery);
    setOpen(true);

    if (value && nextQuery !== value.name) {
      onChange(null);
    }
  };

  const handleSelect = (option) => {
    onChange(option);
    setQuery(option.name);
    setOpen(false);
    setSearchError(null);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
    setOptions([]);
    setSearchError(null);
    setOpen(true);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (event) => {
    if (disabled) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlightedIndex((previous) => Math.min(previous + 1, options.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlightedIndex((previous) => Math.max(previous - 1, 0));
      return;
    }

    if (event.key === 'Enter' && open && highlightedIndex >= 0 && options[highlightedIndex]) {
      event.preventDefault();
      handleSelect(options[highlightedIndex]);
      return;
    }

    if (event.key === 'Escape' && open) {
      event.stopPropagation();
      setOpen(false);
    }
  };

  const activeOptionId =
    open && highlightedIndex >= 0 && options[highlightedIndex]
      ? `${listboxId}-option-${options[highlightedIndex].id}`
      : undefined;

  return (
    <div className="parent-combobox" ref={containerRef}>
      <div className="parent-combobox__control">
        <input
          id={id}
          type="text"
          role="combobox"
          className="parent-combobox__input"
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={handleInputChange}
          onFocus={() => {
            if (!disabled) {
              setOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
        />

        {!disabled && query && (
          <button
            type="button"
            className="parent-combobox__clear"
            aria-label="Очистить выбор"
            onClick={handleClear}
          >
            ×
          </button>
        )}
      </div>

      {open && !disabled && (
        <div className="parent-combobox__listbox" role="listbox" id={listboxId}>
          {loading && <div className="parent-combobox__status">Загрузка…</div>}

          {!loading && searchError && (
            <div className="parent-combobox__status parent-combobox__status--error" role="alert">
              <span>{searchError}</span>
              <button
                type="button"
                className="parent-combobox__retry"
                onClick={() => setReloadToken((token) => token + 1)}
              >
                Повторить
              </button>
            </div>
          )}

          {!loading && !searchError && options.length === 0 && (
            <div className="parent-combobox__status">Ничего не найдено</div>
          )}

          {!loading &&
            !searchError &&
            options.map((option, index) => (
              <button
                type="button"
                key={option.id}
                id={`${listboxId}-option-${option.id}`}
                role="option"
                aria-selected={value ? value.id === option.id : false}
                className={
                  index === highlightedIndex
                    ? 'parent-combobox__option parent-combobox__option--highlighted'
                    : 'parent-combobox__option'
                }
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <span className="parent-combobox__option-name">{option.name}</span>
                <span className={`type-badge type-badge--${option.type.toLowerCase()}`}>
                  {DEPARTMENT_TYPE_LABELS[option.type] || option.type}
                </span>
              </button>
            ))}
        </div>
      )}

      {error && (
        <p className="form-field__error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
