"use client";

import Image from "next/image";
import styles from "./StepperHeader.module.css";

interface StepperHeaderProps {
  activeStep: number;
  totalSteps: number;
  percentage: number;
}

const STEPS = ["About", "Education", "Profile Image"];

export default function StepperHeader({
  activeStep,
  percentage,
}: StepperHeaderProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.tabs}>
        {STEPS.map((step, i) => (
          <button
            key={step}
            type="button"
            className={`${styles.tab} ${i === activeStep ? styles.tabActive : styles.tabInactive}`}
          >
            {step}
          </button>
        ))}
      </div>

      <div className={styles.progressArea}>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${percentage}%` }}
          />
          <span
            className={styles.fireIcon}
            style={{
              // Clamp so the icon stays visible but sits close to the left
              // edge of the track at low percentages.
              left: `clamp(8px, ${percentage}%, calc(100% - 8px))`,
            }}
          >
            <Image
              src="/assets/icons/fire.svg"
              alt="fire"
              width={27}
              height={27}
              className={styles.fireImg}
            />
          </span>
        </div>
        <span className={styles.progressText}>{percentage}% completed</span>
      </div>
    </div>
  );
}
