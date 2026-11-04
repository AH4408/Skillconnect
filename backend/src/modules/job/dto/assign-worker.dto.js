import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class AssignWorkerDto extends BaseDto {
  static schema = Joi.object({
    workerId: Joi.string().hex().length(24).required(),
  });
}
export default AssignWorkerDto;
