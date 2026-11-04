import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class ListPaymentsDto extends BaseDto {
  static schema = Joi.object({
    status: Joi.string().valid("PENDING", "PAID", "REFUNDED", "FAILED"),
  });
}
export default ListPaymentsDto;
