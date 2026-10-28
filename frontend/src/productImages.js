const userProvidedImages = [
  'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D',
  'https://images.unsplash.com/photo-1761330461729-6e5aacbf11b8?q=80&w=706&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D',
  'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?q=80&w=1112&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D',
  'https://plus.unsplash.com/premium_photo-1676234844384-82e1830af724?q=80&w=688&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D',
  'https://images.unsplash.com/photo-1562183241-b937e95585b6?q=80&w=765&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D'
];

// A distinct Unsplash photo selected for each remaining seeded catalog product.
const selectedPhotoIds = [
  '1535659513767-f1a7b068ebc1', '1557461761-c7c2b7a5fa97', '1637437757614-6491c8e915b5',
  '1465495887997-2ad0bc82076e', '1576792741377-eb0f4f6d1a47', '1612705071290-eeb0f44bc58d',
  '1535050040180-e159cb2637f5', '1565021861162-e2a8c7e817e6', '1704677982215-a2248af6009b',
  '1490114538077-0a7f8cb49891', '1525441451246-3970221d4cbf', '1766198198372-156e7a6cba36',
  '1652689994479-aebc341bf8f5', '1533199441292-029b982ffacc', '1622143462763-c31bf56371e5',
  '1563434564528-8fdf5996e622', '1452615975650-a030f3016596', '1517423227235-c43131b3d78f',
  '1734834803558-edec8082aa34', '1706550631437-0ad78e9005d5', '1581285864607-ef85509e7324',
  '1577996152056-ee7ae84747da', '1547451875-f1adc0842d50', '1660696035271-9ebc619c6207',
  '1700178310305-0e05d7930f9f', '1706550633432-81f54bc01657', '1529607225807-563e0851ee7e',
  '1641621504094-f598947590aa', '1730974663196-6ea63be7beef', '1530240712349-f56d317982c9',
  '1549298916-b41d501d3772', '1718724403139-ca810fd1fe94', '1664754978480-82ac6ab992c1',
  '1694186206614-7058fd89db4b', '1705532301641-f0d542cd6c99', '1714563283582-2d68878bc1c6',
  '1637437735621-22472eee4875', '1563661804404-23b0223c0bd0', '1528734056081-a1149a9a0856',
  '1623115893482-5bdd07191e7b', '1556786509-ea5a93a22d80', '1642088338903-735e55b45c1a',
  '1770576568723-c557b096394b', '1778521157912-620fd0d3c6e1', '1570800944264-d961198a4ef9'
];

const catalogImages = [
  ...userProvidedImages,
  ...selectedPhotoIds.map((id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1000&q=82`)
];

export function getProductImages(product) {
  const catalogIndex = Number(product?.slug?.match(/-(\d+)$/)?.[1]) - 1;
  if (Number.isInteger(catalogIndex) && catalogImages[catalogIndex]) return [catalogImages[catalogIndex]];
  return product?.images || [];
}
