type UserInput = {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    cityId: string;
    city: {
      id: string;
      name: string;
      stateCode: string;
      stateName: string;
    };
    pet: unknown;
  };
  
  export function toUserListItem(user: UserInput) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      cityId: user.cityId,
      city: user.city,
      pet: user.pet,
    };
  }