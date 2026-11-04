import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class CreateQuoteDto extends BaseDto {
  static schema = Joi.object({
    amount: Joi.number().min(0).required(),
    eta: Joi.string().trim().max(100).allow("", null),
    message: Joi.string().trim().max(1000).allow("", null),
  });
}
export default CreateQuoteDto;
