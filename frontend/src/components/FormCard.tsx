interface FormCardProps {
  title: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  children: React.ReactNode;
}

function FormCard({ title, onSubmit, children }: FormCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="bg-slate-800 rounded-xl shadow-2xl p-10 w-full max-w-md border border-slate-700">
        <h1 className="text-2xl font-bold text-slate-100 text-center mb-8">{title}</h1>
        <form onSubmit={onSubmit} noValidate>
          {children}
        </form>
      </div>
    </div>
  );
}

export default FormCard;
