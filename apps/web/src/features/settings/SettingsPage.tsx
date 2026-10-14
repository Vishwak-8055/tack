import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { changePasswordSchema, updateProfileSchema, type SessionUser } from '@tack/shared';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { meKey, useSession } from '@/features/auth/session';
import { api, fieldsOf, messageOf } from '@/lib/api';
import { cn } from '@/lib/cn';
import { zodFields } from '@/lib/forms';
import { useTheme, type ThemePreference } from '@/lib/theme';
import { useDocumentTitle } from '@/lib/title';

export function SettingsPage() {
  useDocumentTitle('Settings');
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Settings</h1>
      <ProfileSection />
      <AppearanceSection />
      <PasswordSection />
    </main>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-tray border border-line bg-surface p-5">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      {description && <p className="mt-0.5 text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ProfileSection() {
  const { data: user } = useSession();
  const queryClient = useQueryClient();
  const [name, setName] = useState(user?.name ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: (input: { name: string }) => api.patch<SessionUser>('/auth/me', input),
    onSuccess: (updated) => {
      queryClient.setQueryData(meKey, updated);
      // Names are copied into every cached board (members, comments), so refresh them.
      void queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'me' });
      toast.success('Name updated');
    },
    onError: (error) => setErrors(fieldsOf(error)),
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = updateProfileSchema.safeParse({ name });
    if (!parsed.success) return setErrors(zodFields(parsed.error));
    setErrors({});
    save.mutate(parsed.data);
  };

  return (
    <Section title="Profile">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Name" error={errors.name}>
          <Input
            value={name}
            maxLength={80}
            aria-invalid={!!errors.name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Email" hint="Your email is how people add you to boards.">
          <Input value={user?.email ?? ''} readOnly disabled />
        </Field>
        <Button
          type="submit"
          variant="primary"
          loading={save.isPending}
          disabled={name.trim() === user?.name}
        >
          Save changes
        </Button>
      </form>
    </Section>
  );
}

const THEMES: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: 'system', label: 'Match system', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

function AppearanceSection() {
  const { preference, setPreference } = useTheme();
  return (
    <Section title="Appearance">
      <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-3">
        {THEMES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={preference === value}
            onClick={() => setPreference(value)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-tray border border-line px-3 py-4 font-medium transition-colors hover:bg-sunken',
              preference === value && 'border-ink bg-sunken ring-1 ring-ink',
            )}
          >
            <Icon className="size-5" />
            {label}
          </button>
        ))}
      </div>
    </Section>
  );
}

function PasswordSection() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const change = useMutation({
    mutationFn: (input: typeof form) => api.post('/auth/password', input),
    onSuccess: () => {
      setForm({ currentPassword: '', newPassword: '' });
      toast.success('Password changed. Your other devices were signed out.');
    },
    onError: (error) => {
      const fields = fieldsOf(error);
      setErrors(Object.keys(fields).length ? fields : { currentPassword: messageOf(error) });
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = changePasswordSchema.safeParse(form);
    if (!parsed.success) return setErrors(zodFields(parsed.error));
    setErrors({});
    change.mutate(parsed.data);
  };

  return (
    <Section title="Password" description="Changing it signs you out everywhere else.">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Current password" error={errors.currentPassword}>
          <Input
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            aria-invalid={!!errors.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
          />
        </Field>
        <Field label="New password" error={errors.newPassword} hint="At least 8 characters.">
          <Input
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            aria-invalid={!!errors.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          />
        </Field>
        <Button type="submit" variant="primary" loading={change.isPending}>
          Change password
        </Button>
      </form>
    </Section>
  );
}
