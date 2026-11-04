import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class StatusDto extends BaseDto {
  static schema = Joi.object({
    status: Joi.string()
      .valid(
        "PENDING",
        "QUOTING",
        "ASSIGNED",
        "IN_PROGRESS",
        "COMPLETED",
        "CONFIRMED",
        "CLOSED",
        "CANCELLED",
        "DISPUTED",
      )
      .required(),
  });
}

export default StatusDto;
