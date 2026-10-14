import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { loginSchema } from '@tack/shared';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { fieldsOf, messageOf } from '@/lib/api';
import { zodFields } from '@/lib/forms';
import { AuthLayout } from './AuthLayout';
import { useSignIn } from './session';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const destination = (location.state as { from?: string } | null)?.from ?? '/';
  const signIn = useSignIn();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) return setErrors(zodFields(parsed.error));
    setErrors({});

    signIn.mutate(parsed.data, {
      onSuccess: () => navigate(destination, { replace: true }),
      onError: (error) => {
        const fields = fieldsOf(error);
        setErrors(fields);
        if (Object.keys(fields).length === 0) setFormError(messageOf(error));
      },
    });
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Pick up where you left off."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-semibold text-ink underline underline-offset-2">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && (
          <p
            role="alert"
            className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
          >
            {formError}
          </p>
        )}
        <Field label="Email" error={errors.email}>
          <Input
            type="email"
            autoComplete="email"
            autoFocus
            value={form.email}
            aria-invalid={!!errors.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
        </Field>
        <Field label="Password" error={errors.password}>
          <Input
            type="password"
            autoComplete="current-password"
            value={form.password}
            aria-invalid={!!errors.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </Field>
        <Button type="submit" variant="primary" loading={signIn.isPending} className="w-full">
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
