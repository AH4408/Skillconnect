import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class CreateJobDto extends BaseDto {
  static schema = Joi.object({
    title: Joi.string().trim().min(3).max(100).required(),
    description: Joi.string().trim().min(15).max(2000).required(),
    category: Joi.string().trim().min(2).max(100).required(),
    budget: Joi.number().min(0).required(),
    city: Joi.string().trim().min(2).max(100).required(),
    area: Joi.string().trim().max(150).allow("", null),
    address: Joi.string().trim().max(300).allow("", null),
    preferredDate: Joi.date().allow(null),
  });
}

export default CreateJobDto;
