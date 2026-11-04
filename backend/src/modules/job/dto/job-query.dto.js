import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class JobQueryDto extends BaseDto {
  static schema = Joi.object({
    status: Joi.string().trim(),
    category: Joi.string().trim().max(100),
    city: Joi.string().trim().max(100),
    search: Joi.string().trim().max(150),
  });
}
export default JobQueryDto;
