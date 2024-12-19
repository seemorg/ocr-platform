import { UseFormReturn } from "react-hook-form";
import { z } from "zod";

import { FormControl, FormField, FormItem, FormLabel } from "./ui/form";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Textarea } from "./ui/textarea";

interface Props {
  form: UseFormReturn<any>;
  disabled?: boolean;
}

export const physicalDetailsSchema = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("published"),
      investigator: z.string().optional(),
      publisher: z.string().optional(),
      publisherLocation: z.string().optional(),
      editionNumber: z.string().optional(),
      publicationYear: z.string().optional(),
      notes: z.string().optional(),
    }),
    z.object({ type: z.literal("manuscript"), notes: z.string().optional() }),
  ])
  .nullable()
  .default(null);

export default function PhysicalDetails({ form, disabled }: Props) {
  const details = form.watch("physicalDetails");
  const type = details?.type;

  return (
    <div className="space-y-6">
      <RadioGroup
        value={type}
        onValueChange={(value: "published" | "manuscript") => {
          form.setValue("physicalDetails", { type: value });
        }}
        disabled={disabled}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="published" id="published" />
          <Label htmlFor="published">Published Book</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="manuscript" id="manuscript" />
          <Label htmlFor="manuscript">Manuscript or Missing</Label>
        </div>
      </RadioGroup>

      {type === "published" && (
        <div className="grid grid-cols-2 gap-10">
          <FormField
            control={form.control}
            name="physicalDetails.investigator"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Investigator (المحقق)</FormLabel>
                <FormControl>
                  <Input disabled={disabled} {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="physicalDetails.publisher"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Publisher (دار النشر)</FormLabel>
                <FormControl>
                  <Input disabled={disabled} {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="physicalDetails.publisherLocation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Publisher Location (مدينة النشر)</FormLabel>
                <FormControl>
                  <Input disabled={disabled} {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="physicalDetails.editionNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Edition Number (رقم الطبعة)</FormLabel>
                <FormControl>
                  <Input disabled={disabled} {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="physicalDetails.publicationYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Publication Year (سنة النشر)</FormLabel>
                <FormControl>
                  <Input disabled={disabled} {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      )}

      <FormField
        control={form.control}
        name="physicalDetails.notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {type === "manuscript" ? "Manuscript Details" : "Notes"}
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder={
                  type === "manuscript"
                    ? "Enter manuscript details"
                    : "Enter notes"
                }
                disabled={disabled}
                {...field}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}
