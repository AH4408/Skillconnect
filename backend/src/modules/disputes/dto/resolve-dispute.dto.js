import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class ResolveDisputeDto extends BaseDto {
  static schema = Joi.object({
    resolution: Joi.string().trim().min(10).max(1000).required(),
  });
}

export default ResolveDisputeDto;
