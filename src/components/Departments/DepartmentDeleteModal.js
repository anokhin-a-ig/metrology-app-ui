import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { DELETE_COUNTDOWN_SECONDS } from '../../services/constants';
import { deleteDepartment, fetchDeletionCheck } from '../../services/departments';

const BLOCKER_LABELS = {
  CHILDREN: 'дочерние подразделения',
  EMPLOYEES: 'сотрудники',
  MEASUREMENTS: 'измерения',
};

const RING_RADIUS = 26;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function isActiveBlocker(blocker) {
  return blocker.count === undefined || blocker.count === null || blocker.count > 0;
}

function formatBlocker(blocker) {
  const label = BLOCKER_LABELS[blocker.type] || blocker.type;

  if (typeof blocker.count === 'number' && blocker.count > 0) {
    return `${label} — ${blocker.count}`;
  }

  return label;
}

function hasBlocker(blockers, type) {
  return blockers.some((blocker) => blocker.type === type && isActiveBlocker(blocker));
}

export default function DepartmentDeleteModal({
  department,
  onClose,
  onDeleted,
  onShowChildren,
}) {
  const titleId = useId();
  const nameId = useId();
  const hintId = useId();
  const nameInputRef = useRef(null);
  const cancelCountdownRef = useRef(null);
  const deadlineRef = useRef(0);
  const firedRef = useRef(false);
  const [phase, setPhase] = useState(department.hasChildren ? 'blocked' : 'checking');
  const [blockers, setBlockers] = useState(
    department.hasChildren ? [{ type: 'CHILDREN' }] : []
  );
  const [typedName, setTypedName] = useState('');
  const [serverError, setServerError] = useState(null);
  const [remaining, setRemaining] = useState(DELETE_COUNTDOWN_SECONDS);
  const [announcement, setAnnouncement] = useState('');

  const isBusy = phase === 'deleting';

  const handleClose = useCallback(() => {
    if (!isBusy) {
      onClose();
    }
  }, [isBusy, onClose]);

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
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  useEffect(() => {
    if (phase === 'confirm') {
      nameInputRef.current?.focus();
    } else if (phase === 'countdown') {
      cancelCountdownRef.current?.focus();
    }
  }, [phase]);

  useEffect(() => {
    if (department.hasChildren) {
      return undefined;
    }

    let active = true;

    fetchDeletionCheck(department.id)
      .then((check) => {
        if (!active) {
          return;
        }

        const activeBlockers = (check?.blockers || []).filter(isActiveBlocker);

        if (check && check.canDelete === false) {
          setBlockers(activeBlockers);
          setPhase('blocked');
          return;
        }

        setPhase('confirm');
      })
      .catch(() => {
        if (active) {
          setPhase('confirm');
        }
      });

    return () => {
      active = false;
    };
  }, [department]);

  const startCountdown = useCallback(() => {
    firedRef.current = false;
    deadlineRef.current = Date.now() + DELETE_COUNTDOWN_SECONDS * 1000;
    setRemaining(DELETE_COUNTDOWN_SECONDS);
    setServerError(null);
    setAnnouncement('Отсчёт удаления начат');
    setPhase('countdown');
  }, []);

  const runDelete = useCallback(async () => {
    if (firedRef.current) {
      return;
    }

    firedRef.current = true;
    setAnnouncement('Удаление начато');
    setPhase('deleting');

    try {
      await deleteDepartment(department.id);
      onDeleted(department);
    } catch (error) {
      if (error.status === 404) {
        onDeleted(department, { alreadyDeleted: true });
        return;
      }

      firedRef.current = false;
      setServerError(error.message);
      setPhase('error');
    }
  }, [department, onDeleted]);

  useEffect(() => {
    if (phase !== 'countdown') {
      return undefined;
    }

    const tick = () => {
      const left = Math.max(0, deadlineRef.current - Date.now());
      setRemaining(Math.ceil(left / 1000));

      if (left <= 0) {
        clearInterval(intervalId);
        runDelete();
      }
    };

    const intervalId = setInterval(tick, 100);
    tick();

    return () => clearInterval(intervalId);
  }, [phase, runDelete]);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (typedName.trim() !== department.name) {
      return;
    }

    startCountdown();
  };

  const canDelete = typedName.trim() === department.name;
  const progress = Math.max(
    0,
    Math.min(1, remaining / DELETE_COUNTDOWN_SECONDS)
  );

  return (
    <div
      className="modal-overlay"
      data-testid="delete-modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className="modal modal--delete"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal__header">
          <h2 className="modal__title" id={titleId}>
            {phase === 'blocked' ? 'Удаление невозможно' : 'Удалить департамент?'}
          </h2>
          <button
            type="button"
            className="modal__close"
            aria-label="Закрыть"
            onClick={handleClose}
            disabled={isBusy}
          >
            ×
          </button>
        </div>

        <p className="visually-hidden" aria-live="polite">
          {announcement}
        </p>

        {phase === 'checking' && (
          <p className="delete-modal__status" role="status">
            Проверка возможности удаления…
          </p>
        )}

        {phase === 'blocked' && (
          <div className="delete-modal__blocked">
            <p>
              Департамент <strong>{department.name}</strong> нельзя удалить.
            </p>
            {blockers.length > 0 ? (
              <ul className="delete-modal__blockers">
                {blockers.map((blocker) => (
                  <li key={blocker.type}>{formatBlocker(blocker)}</li>
                ))}
              </ul>
            ) : (
              <p>На департамент ссылаются другие данные.</p>
            )}
            <div className="modal__actions">
              {hasBlocker(blockers, 'CHILDREN') && (
                <button
                  type="button"
                  className="modal__button modal__button--secondary"
                  onClick={() => onShowChildren(department)}
                >
                  Показать дочерние
                </button>
              )}
              <button
                type="button"
                className="modal__button modal__button--cancel"
                onClick={handleClose}
              >
                Закрыть
              </button>
            </div>
          </div>
        )}

        {phase === 'confirm' && (
          <form className="modal__form" onSubmit={handleSubmit} noValidate>
            <p className="delete-modal__warning">
              Вы собираетесь удалить департамент{' '}
              <strong className="delete-modal__warning-name">
                {department.name}
              </strong>
              {' '}Действие необратимо.
            </p>

            <div className="form-field">
              <label className="form-field__label" htmlFor={nameId}>
                Введите название департамента для подтверждения
              </label>
              <input
                id={nameId}
                ref={nameInputRef}
                className="form-field__input"
                type="text"
                value={typedName}
                autoComplete="off"
                aria-describedby={hintId}
                onChange={(event) => setTypedName(event.target.value)}
              />
              <p className="form-field__hint" id={hintId}>
                Сравнение учитывает регистр и пробелы по краям.
              </p>
            </div>

            <div className="modal__actions">
              <button
                type="button"
                className="modal__button modal__button--cancel"
                onClick={handleClose}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="modal__button modal__button--danger"
                disabled={!canDelete}
              >
                Удалить
              </button>
            </div>
          </form>
        )}

        {phase === 'countdown' && (
          <div className="delete-modal__countdown">
            <div
              className="delete-countdown__ring"
              role="timer"
              aria-live="off"
              aria-label={`До удаления ${remaining} секунд`}
            >
              <svg
                className="delete-countdown__svg"
                width="64"
                height="64"
                viewBox="0 0 64 64"
                aria-hidden="true"
              >
                <circle
                  className="delete-countdown__track"
                  cx="32"
                  cy="32"
                  r={RING_RADIUS}
                />
                <circle
                  className="delete-countdown__progress"
                  cx="32"
                  cy="32"
                  r={RING_RADIUS}
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
                />
              </svg>
              <span className="delete-countdown__value" aria-hidden="true">
                {remaining}
              </span>
            </div>

            <p>Удаление через {remaining} с.</p>

            <button
              type="button"
              ref={cancelCountdownRef}
              className="modal__button modal__button--secondary"
              onClick={() => setPhase('confirm')}
            >
              Отменить удаление
            </button>
          </div>
        )}

        {phase === 'deleting' && (
          <p className="delete-modal__status" role="status">
            Удаление…
          </p>
        )}

        {phase === 'error' && (
          <div className="delete-modal__error">
            <div className="modal__server-error" role="alert">
              {serverError}
            </div>
            <div className="modal__actions">
              <button
                type="button"
                className="modal__button modal__button--cancel"
                onClick={handleClose}
              >
                Закрыть
              </button>
              <button
                type="button"
                className="modal__button modal__button--danger"
                onClick={startCountdown}
              >
                Повторить
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
