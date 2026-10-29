import React from 'react';
import { Navigate, Outlet, Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function AdminRoute() {
  const { user, isLoadingAuth, authChecked } = useAuth();

  if (isLoadingAuth || !authChecked) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (user.role !== 'admin') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-gold" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Acceso restringido</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta sección está disponible únicamente para administradores.
        </p>
        <Link to="/" className="mt-6 inline-block text-sm font-semibold text-gold-light hover:text-gold">
          Volver al inicio
        </Link>
      </div>
    );
  }

  return <Outlet />;
}