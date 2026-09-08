import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">SPT</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Iniciar Sesión</h1>
          <p className="text-dark-400 mt-2">
            Accedé al panel de administración
          </p>
        </div>
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 shadow-xl">
          <GoogleSignInButton />
          <p className="mt-4 text-center text-dark-500 text-xs">
            Solo los administradores autorizados pueden acceder al panel.
          </p>
        </div>
      </div>
    </div>
  );
}
