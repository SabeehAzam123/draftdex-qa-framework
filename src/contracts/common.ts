import { z } from "zod";

/**
 * Contracts are strict: a field the app adds, renames or drops fails the test with the exact path.
 * That is the point: the framework notices when the API changes shape.
 */

export const IsoDate = z.iso.datetime({ offset: true }).or(z.iso.datetime());
export const Id = (prefix: string) => z.string().regex(new RegExp(`^${prefix}_[0-9a-f]{16}$`), `an id starting ${prefix}_`);

/** Every error: `{ message, code, traceId, details? }`. */
export const ErrorBody = z.strictObject({
    message: z.string().min(1),
    code: z.string().regex(/^[A-Z][A-Z_]+$/),
    traceId: z.uuid(),
    details: z.array(z.strictObject({ path: z.string(), message: z.string() })).optional(),
});
export type ErrorBody = z.infer<typeof ErrorBody>;

/** `{ data }`: every single-item answer. */
export const Envelope = <T extends z.ZodType>(data: T) => z.strictObject({ data });

/** `{ data, page, pageSize, total }`: every list. */
export const Page = <T extends z.ZodType>(item: T) =>
    z.strictObject({ data: z.array(item), page: z.number().int().min(1), pageSize: z.number().int().min(1), total: z.number().int().min(0) });
export type Page<T> = { data: T[]; page: number; pageSize: number; total: number };

export const Health = z.strictObject({ status: z.literal("ok"), app: z.literal("DraftDex") });
export const Updated = z.strictObject({ updated: z.number().int().min(0) });
