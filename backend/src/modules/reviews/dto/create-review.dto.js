import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class CreateReviewDto extends BaseDto {
  static schema = Joi.object({
    job: Joi.string().hex().length(24).required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().trim().max(1000).allow("", null),
  });
}
export default CreateReviewDto;
