import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class ListReviewsDto extends BaseDto {
  static schema = Joi.object({
    rating: Joi.number().integer().min(1).max(5),
  });
}
export default ListReviewsDto;
