import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class CreateDisputeDto extends BaseDto {
  static schema = Joi.object({
    job: Joi.string().hex().length(24).required(),
    category: Joi.string().trim().min(2).max(100).required(),
    description: Joi.string().trim().min(20).max(1000).required(),
  });
}

export default CreateDisputeDto;
