import { z } from "zod";
import { PROPERTY_TYPES } from "@/lib/enums";

export const createPropertySchema = z.object({
  name: z.string().min(1, "관리용 물건명을 입력하세요"),
  address: z.string().min(1, "주소를 입력하세요"),
  propertyType: z.enum(PROPERTY_TYPES),
  buildingName: z.string().optional(),
  dongHo: z.string().optional(),
  floor: z.coerce.number().int().optional(),
  exclusiveArea: z.coerce.number().positive().optional(),
  contractArea: z.coerce.number().positive().optional(),
  landArea: z.coerce.number().positive().optional(),
  builtYear: z.coerce.number().int().optional(),
  direction: z.string().optional(),
  parking: z.string().optional(),
  appraisalPrice: z.coerce.number().positive().optional(),
  askingPrice: z.coerce.number().positive().optional(),
  memo: z.string().optional(),
  isAuction: z.boolean().optional().default(false),
  auction: z
    .object({
      caseNumber: z.string().min(1),
      court: z.string().min(1),
      appraisalPrice: z.coerce.number().positive().optional(),
      minimumSalePrice: z.coerce.number().positive().optional(),
      failedBidCount: z.coerce.number().int().optional(),
      saleDate: z.string().optional(),
    })
    .optional(),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
