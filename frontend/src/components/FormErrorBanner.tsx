interface FormErrorBannerProps {
  message: string;
}

function FormErrorBanner({ message }: FormErrorBannerProps) {
  if (!message) return null;

  return (
    <p className="mb-4 px-3 py-2.5 bg-red-900/40 border border-red-700 rounded-md text-sm text-red-300">
      {message}
    </p>
  );
}

export default FormErrorBanner;
