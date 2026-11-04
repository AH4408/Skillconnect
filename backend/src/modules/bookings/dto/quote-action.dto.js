import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class QuoteActionDto extends BaseDto {
  static schema = Joi.object({
    workerId: Joi.string().hex().length(24).required(),
    quoteId: Joi.string().hex().length(24),
  });
}
export default QuoteActionDto;
