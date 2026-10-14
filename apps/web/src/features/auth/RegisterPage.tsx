import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { registerSchema } from '@tack/shared';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { fieldsOf, messageOf } from '@/lib/api';
import { zodFields } from '@/lib/forms';
import { AuthLayout } from './AuthLayout';
import { useRegister } from './session';

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useRegister();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) return setErrors(zodFields(parsed.error));
    setErrors({});

    register.mutate(parsed.data, {
      onSuccess: () => navigate('/', { replace: true }),
      onError: (error) => {
        const fields = fieldsOf(error);
        setErrors(fields);
        if (Object.keys(fields).length === 0) setFormError(messageOf(error));
      },
    });
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="It takes a few seconds and costs nothing."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-ink underline underline-offset-2">
            Sign in
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
        <Field label="Name" error={errors.name}>
          <Input
            autoComplete="name"
            autoFocus
            value={form.name}
            aria-invalid={!!errors.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </Field>
        <Field label="Email" error={errors.email}>
          <Input
            type="email"
            autoComplete="email"
            value={form.email}
            aria-invalid={!!errors.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
        </Field>
        <Field label="Password" error={errors.password} hint="At least 8 characters.">
          <Input
            type="password"
            autoComplete="new-password"
            value={form.password}
            aria-invalid={!!errors.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </Field>
        <Button type="submit" variant="primary" loading={register.isPending} className="w-full">
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
