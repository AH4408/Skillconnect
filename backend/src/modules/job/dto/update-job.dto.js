import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class UpdateJobDto extends BaseDto {
  static schema = Joi.object({
    title: Joi.string().trim().min(3).max(100),
    description: Joi.string().trim().min(15).max(2000),
    category: Joi.string().trim().min(2).max(100),
    budget: Joi.number().min(0),
    city: Joi.string().trim().min(2).max(100),
    area: Joi.string().trim().max(150).allow("", null),
    address: Joi.string().trim().max(300).allow("", null),
    preferredDate: Joi.date().allow(null),
  }).min(1);
}

export default UpdateJobDto;
