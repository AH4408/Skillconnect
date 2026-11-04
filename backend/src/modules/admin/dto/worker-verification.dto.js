import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class WorkerVerificationDto extends BaseDto {
  static schema = Joi.object({
    verification: Joi.string().valid("pending", "approved", "rejected").required(),
  });
}
export default WorkerVerificationDto;
