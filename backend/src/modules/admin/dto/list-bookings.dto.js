import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class ListBookingsDto extends BaseDto {
  static schema = Joi.object({
    status: Joi.string().valid("PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CONFIRMED_BY_CLIENT", "CANCELLED", "DISPUTED"),
  });
}
export default ListBookingsDto;
