import { useEffect, useId, useRef, useState } from 'react';
import { DEPARTMENT_TYPES, DEPARTMENT_TYPE_LABELS } from '../../services/constants';
import { createDepartment } from '../../services/departments';
import ParentCombobox from './ParentCombobox';

const NAME_MAX_LENGTH = 255;

export default function DepartmentCreateModal({ onClose, onCreated }) {
  const titleId = useId();
  const nameId = useId();
  const typeId = useId();
  const parentId = useId();
  const nameInputRef = useRef(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [parent, setParent] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const parentDisabled = !type || type === 'FACTORY';
  const parentRequired = Boolean(type) && type !== 'FACTORY';

  const handleNameChange = (event) => {
    setName(event.target.value);
    setFieldErrors((previous) => ({ ...previous, name: undefined }));
    setServerError(null);
  };

  const handleTypeChange = (event) => {
    const nextType = event.target.value;
    setType(nextType);

    if (nextType === 'FACTORY') {
      setParent(null);
    }

    setFieldErrors((previous) => ({
      ...previous,
      type: undefined,
      parent: undefined,
    }));
    setServerError(null);
  };

  const handleParentChange = (nextParent) => {
    setParent(nextParent);
    setFieldErrors((previous) => ({ ...previous, parent: undefined }));
    setServerError(null);
  };

  const validate = () => {
    const errors = {};
    const trimmedName = name.trim();

    if (!trimmedName) {
      errors.name = 'Введите название департамента';
    } else if (trimmedName.length > NAME_MAX_LENGTH) {
      errors.name = `Название не должно превышать ${NAME_MAX_LENGTH} символов`;
    }

    if (!type) {
      errors.type = 'Выберите тип департамента';
    }

    if (parentRequired && !parent) {
      errors.parent = 'Выберите родительский департамент';
    }

    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setServerError(null);

    try {
      const created = await createDepartment({
        name: name.trim(),
        type,
        parentId: type === 'FACTORY' ? undefined : parent.id,
      });

      onCreated(created);
    } catch (error) {
      setServerError(error.message);
      setSubmitting(false);
    }
  };

  const parentPlaceholder = !type
    ? 'Сначала выберите тип'
    : type === 'FACTORY'
      ? 'Завод — корневой департамент'
      : 'Начните вводить название';

  return (
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal__header">
          <h2 className="modal__title" id={titleId}>
            Новый департамент
          </h2>
          <button
            type="button"
            className="modal__close"
            aria-label="Закрыть"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form className="modal__form" onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label className="form-field__label" htmlFor={nameId}>
              Название
            </label>
            <input
              id={nameId}
              ref={nameInputRef}
              className="form-field__input"
              type="text"
              value={name}
              maxLength={NAME_MAX_LENGTH}
              aria-invalid={fieldErrors.name ? 'true' : undefined}
              aria-describedby={fieldErrors.name ? `${nameId}-error` : undefined}
              onChange={handleNameChange}
            />
            {fieldErrors.name && (
              <p className="form-field__error" id={`${nameId}-error`} role="alert">
                {fieldErrors.name}
              </p>
            )}
          </div>

          <div className="form-field">
            <label className="form-field__label" htmlFor={typeId}>
              Тип
            </label>
            <select
              id={typeId}
              className="form-field__input"
              value={type}
              aria-invalid={fieldErrors.type ? 'true' : undefined}
              aria-describedby={fieldErrors.type ? `${typeId}-error` : undefined}
              onChange={handleTypeChange}
            >
              <option value="">Выберите тип</option>
              {DEPARTMENT_TYPES.map((departmentType) => (
                <option key={departmentType} value={departmentType}>
                  {DEPARTMENT_TYPE_LABELS[departmentType]}
                </option>
              ))}
            </select>
            {fieldErrors.type && (
              <p className="form-field__error" id={`${typeId}-error`} role="alert">
                {fieldErrors.type}
              </p>
            )}
          </div>

          <div className="form-field">
            <label className="form-field__label" htmlFor={parentId}>
              Входит в состав
            </label>
            <ParentCombobox
              id={parentId}
              value={parent}
              onChange={handleParentChange}
              disabled={parentDisabled}
              placeholder={parentPlaceholder}
              error={fieldErrors.parent}
            />
          </div>

          {serverError && (
            <div className="modal__server-error" role="alert">
              {serverError}
            </div>
          )}

          <div className="modal__actions">
            <button
              type="button"
              className="modal__button modal__button--cancel"
              onClick={onClose}
              disabled={submitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="modal__button modal__button--submit"
              disabled={submitting}
            >
              {submitting ? 'Сохранение…' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
