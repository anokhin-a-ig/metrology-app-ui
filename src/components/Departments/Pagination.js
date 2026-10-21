export default function Pagination({ number, totalPages, onChange, disabled = false }) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className="pagination" aria-label="Страницы департаментов">
      <button
        type="button"
        className="pagination__button"
        onClick={() => onChange(number - 1)}
        disabled={disabled || number <= 0}
      >
        Назад
      </button>

      {Array.from({ length: totalPages }, (_, index) => (
        <button
          key={index}
          type="button"
          className={
            index === number
              ? 'pagination__button pagination__button--current'
              : 'pagination__button'
          }
          aria-current={index === number ? 'page' : undefined}
          onClick={() => onChange(index)}
          disabled={disabled || index === number}
        >
          {index + 1}
        </button>
      ))}

      <button
        type="button"
        className="pagination__button"
        onClick={() => onChange(number + 1)}
        disabled={disabled || number >= totalPages - 1}
      >
        Вперёд
      </button>
    </nav>
  );
}
