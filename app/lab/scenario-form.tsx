"use client";
// Person A
import { useState } from "react";
import type { MaterialFamily, SafetyArea, Scenario } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GRAVITIES,
  GRAVITY_LABEL,
  MATERIAL_FAMILIES,
  SAFETY_AREAS,
  type Preset,
} from "./scenario";

type Props = {
  scenario: Scenario;
  presets: Preset[];
  onChange: (next: Scenario) => void;
  /** Called after a preset is applied, so the page can bring the results into view. */
  onPreset?: () => void;
};

export function ScenarioForm({ scenario, presets, onChange, onPreset }: Props) {
  const set = <K extends keyof Scenario>(key: K, value: Scenario[K]) => {
    const next = { ...scenario, [key]: value };
    if (value === undefined) delete next[key];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-6">
      <FieldSet>
        <FieldLegend>Presets</FieldLegend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {presets.map((p) => (
            <div key={p.id} className="flex flex-col items-start gap-1.5">
              <Button
                variant="outline"
                onClick={() => {
                  onChange(p.scenario);
                  onPreset?.();
                }}
              >
                {p.label}
              </Button>
              <p className="text-sm text-muted-foreground">{p.source}</p>
            </div>
          ))}
        </div>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Scenario</FieldLegend>
        <FieldGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <OptionField
            id="material"
            label="Material"
            anyLabel="Any material"
            options={MATERIAL_FAMILIES.map((f) => ({ label: f, value: f }))}
            value={scenario.materialFamily ?? null}
            onChange={(v) => set("materialFamily", (v ?? undefined) as MaterialFamily | undefined)}
          />
          <NumberField
            id="o2"
            label="Oxygen (% by volume)"
            step={0.1}
            value={scenario.o2Pct}
            onChange={(v) => set("o2Pct", v)}
          />
          <NumberField
            id="flow"
            label="Airflow (cm/s)"
            step={0.5}
            value={scenario.flowCmS}
            onChange={(v) => set("flowCmS", v)}
          />
          <OptionField
            id="gravity"
            label="Gravity"
            anyLabel="Any gravity"
            options={GRAVITIES.map((g) => ({ label: GRAVITY_LABEL[g], value: g }))}
            value={scenario.gravity ?? null}
            onChange={(v) => set("gravity", (v ?? undefined) as Scenario["gravity"])}
          />
          <OptionField
            id="area"
            label="Safety area"
            anyLabel="Any safety area"
            options={SAFETY_AREAS.map((a) => ({ label: a, value: a }))}
            value={scenario.safetyArea ?? null}
            onChange={(v) => set("safetyArea", (v ?? undefined) as SafetyArea | undefined)}
          />
          <NumberField
            id="pressure"
            label="Pressure (psi)"
            step={0.1}
            value={scenario.pressurePsi}
            onChange={(v) => set("pressurePsi", v)}
            description="Pressure is context only; none of the imported PSI tables records it."
          />
        </FieldGroup>
      </FieldSet>

      <div>
        <Button variant="ghost" onClick={() => onChange({})}>
          Clear scenario
        </Button>
      </div>
    </div>
  );
}

function OptionField({
  id,
  label,
  anyLabel,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  anyLabel: string;
  options: { label: string; value: string }[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const items = [{ label: anyLabel, value: null as string | null }, ...options];
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select items={items} value={value} onValueChange={(v) => onChange(v as string | null)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.value ?? "any"} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

/**
 * Number input that keeps the user's partial text ("17.") while the URL holds
 * the parsed number, and follows the URL when a preset or "clear" changes it.
 */
function NumberField({
  id,
  label,
  step,
  value,
  onChange,
  description,
}: {
  id: string;
  label: string;
  step: number;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  description?: string;
}) {
  const [text, setText] = useState(value === undefined ? "" : String(value));
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    const typed = text.trim() === "" ? undefined : Number(text);
    if (typed !== value) setText(value === undefined ? "" : String(value));
  }

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        name={id}
        autoComplete="off"
        type="number"
        inputMode="decimal"
        step={step}
        min={0}
        value={text}
        placeholder="Any"
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          if (raw.trim() === "") return onChange(undefined);
          const n = Number(raw);
          if (Number.isFinite(n)) onChange(n);
        }}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  );
}
