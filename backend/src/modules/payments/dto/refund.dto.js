import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class RefundDto extends BaseDto {
  static schema = Joi.object({
    reason: Joi.string().trim().max(500).allow("", null),
  });
}
export default RefundDto;
