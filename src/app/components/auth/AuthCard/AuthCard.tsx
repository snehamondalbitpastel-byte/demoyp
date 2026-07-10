"use client";

import styles from "./AuthCard.module.css";

interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function AuthCard({ children, className }: AuthCardProps) {
  return (
    <div className={`${styles.card}${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}
