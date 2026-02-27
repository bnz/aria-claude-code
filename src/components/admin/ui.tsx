"use client";

import { type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
}

const buttonVariantClasses: Record<string, string> = {
  primary: "bg-accent text-accent-foreground hover:opacity-90",
  secondary: "border border-border bg-background text-foreground hover:bg-muted",
  danger: "bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800",
};

const buttonSizeClasses: Record<string, string> = {
  sm: "px-3 py-1 text-sm",
  md: "px-4 py-2 text-sm",
};

export function AdminButton({
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  children,
  ...props
}: AdminButtonProps) {
  return (
    <button
      className={`rounded-md font-medium transition-colors disabled:opacity-50 ${buttonVariantClasses[variant]} ${buttonSizeClasses[size]} ${className}`.trim()}
      disabled={disabled}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  );
}

interface AdminInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  id: string;
  error?: string;
}

export function AdminInput({ label, id, error, className = "", ...props }: AdminInputProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        className={`block w-full rounded-md border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent ${error ? "border-red-500" : "border-border"} ${className}`.trim()}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

interface AdminTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
  label: string;
  id: string;
  error?: string;
}

export function AdminTextarea({ label, id, error, className = "", ...props }: AdminTextareaProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <textarea
        id={id}
        className={`block w-full rounded-md border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent ${error ? "border-red-500" : "border-border"} ${className}`.trim()}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

interface AdminCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function AdminCard({ title, children, className = "" }: AdminCardProps) {
  return (
    <div
      className={`rounded-lg border border-border bg-background p-4 ${className}`.trim()}
      data-testid="admin-card"
    >
      {title && (
        <h2 className="mb-3 text-lg font-semibold text-foreground">{title}</h2>
      )}
      {children}
    </div>
  );
}
