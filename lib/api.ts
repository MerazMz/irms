export async function getProducts() {
  const res =
    await fetch(
      "/api/products"
    );

  if (!res.ok) {
    throw new Error(
      "Failed to fetch products"
    );
  }

  return res.json();
}