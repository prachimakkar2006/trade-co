import mongoose from 'mongoose';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

export async function getAddresses(userId) {
  const user = await User.findById(userId).select('addresses').lean();
  if (!user) throw new ApiError(404, 'Account not found.');
  return user.addresses || [];
}

export async function createAddress(userId, address) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'Account not found.');
  if (address.isDefault || user.addresses.length === 0) user.addresses.forEach((item) => { item.isDefault = false; });
  user.addresses.push({ ...address, isDefault: address.isDefault || user.addresses.length === 0 });
  await user.save();
  return user.addresses[user.addresses.length - 1];
}

export async function updateAddress(userId, addressId, changes) {
  if (!mongoose.isValidObjectId(addressId)) throw new ApiError(400, 'Invalid address.');
  const user = await User.findById(userId);
  const address = user?.addresses.id(addressId);
  if (!address) throw new ApiError(404, 'Address not found.');
  if (changes.isDefault) user.addresses.forEach((item) => { item.isDefault = String(item._id) === addressId; });
  Object.assign(address, changes);
  await user.save();
  return address;
}

export async function deleteAddress(userId, addressId) {
  if (!mongoose.isValidObjectId(addressId)) throw new ApiError(400, 'Invalid address.');
  const user = await User.findById(userId);
  const address = user?.addresses.id(addressId);
  if (!address) throw new ApiError(404, 'Address not found.');
  const wasDefault = address.isDefault;
  address.deleteOne();
  if (wasDefault && user.addresses.length) user.addresses[0].isDefault = true;
  await user.save();
  return user.addresses;
}

export async function lookupPincode(pincode) {
  let response;
  try {
    response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, { signal: AbortSignal.timeout(6000) });
  } catch {
    throw new ApiError(502, 'Postal code lookup is temporarily unavailable. Enter your city and state manually.');
  }
  if (!response.ok) throw new ApiError(502, 'Postal code lookup is temporarily unavailable.');
  const [result] = await response.json();
  if (result?.Status !== 'Success' || !result.PostOffice?.length) throw new ApiError(404, 'We could not find that Indian PIN code.');
  const first = result.PostOffice[0];
  return {
    pincode,
    city: first.District || first.Block || '',
    state: first.State || '',
    localities: [...new Set(result.PostOffice.map((office) => office.Name).filter(Boolean))]
  };
}
