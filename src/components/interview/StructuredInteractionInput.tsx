"use client";

import type { MessageInteraction } from "@/lib/aura/interaction";
import type { Language } from "@/lib/aura/i18n";
import { McqOptions } from "@/components/interview/McqOptions";
import { YesNoOptions } from "@/components/interview/YesNoOptions";
import { RatingInput } from "@/components/interview/RatingInput";
import { NumericInput } from "@/components/interview/NumericInput";

export interface StructuredSelection {
  interactionType: MessageInteraction["type"];
  answerEn: string;
  answerLocale: string;
  optionId?: string;
  value?: string | number | boolean;
}

interface StructuredInteractionInputProps {
  interaction: MessageInteraction;
  preferredLanguage: Language;
  disabled?: boolean;
  answered?: boolean;
  selectHint?: string;
  orTypeHint?: string;
  submitLabel?: string;
  onSelect: (selection: StructuredSelection) => void;
}

export function StructuredInteractionInput({
  interaction,
  preferredLanguage,
  disabled,
  answered,
  selectHint,
  orTypeHint,
  submitLabel,
  onSelect,
}: StructuredInteractionInputProps) {
  switch (interaction.type) {
    case "mcq":
      return (
        <McqOptions
          interaction={interaction}
          preferredLanguage={preferredLanguage}
          disabled={disabled}
          answered={answered}
          selectHint={selectHint}
          orTypeHint={orTypeHint}
          onSelect={(answerEn, answerLocale, optionId) =>
            onSelect({
              interactionType: "mcq",
              answerEn,
              answerLocale,
              optionId,
              value: optionId,
            })
          }
        />
      );
    case "yes_no":
      return (
        <YesNoOptions
          interaction={interaction}
          disabled={disabled}
          answered={answered}
          selectHint={selectHint}
          onSelect={(answerEn, answerLocale, value) =>
            onSelect({
              interactionType: "yes_no",
              answerEn,
              answerLocale,
              value,
            })
          }
        />
      );
    case "rating":
      return (
        <RatingInput
          interaction={interaction}
          disabled={disabled}
          answered={answered}
          selectHint={selectHint}
          onSubmit={(answerEn, answerLocale, value) =>
            onSelect({
              interactionType: "rating",
              answerEn,
              answerLocale,
              value,
            })
          }
        />
      );
    case "numeric":
      return (
        <NumericInput
          interaction={interaction}
          disabled={disabled}
          answered={answered}
          selectHint={selectHint}
          submitLabel={submitLabel}
          onSubmit={(answerEn, answerLocale, value) =>
            onSelect({
              interactionType: "numeric",
              answerEn,
              answerLocale,
              value,
            })
          }
        />
      );
    default: {
      const _exhaustive: never = interaction;
      return _exhaustive;
    }
  }
}
