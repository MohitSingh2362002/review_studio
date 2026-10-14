import {googleUrl} from './reviews';
export function mapGoogleLocation(location:any,attributes:any,media:any){
 const a=location.storefrontAddress||{};
 const whatsapp=attributes?.attributes?.find((x:any)=>x.name==='attributes/url_whatsapp')?.uriValues?.[0]?.uri||'';
 const pictures=media?.mediaItems||[];const photo=pictures.find((x:any)=>x.locationAssociation?.category==='LOGO')||pictures.find((x:any)=>x.locationAssociation?.category==='COVER')||pictures[0];
 const names=(location.serviceItems||[]).map((s:any)=>s.freeFormServiceItem?.label?.displayName||s.structuredServiceItem?.description||'').filter(Boolean);
 const reviewUrl=googleUrl(location.metadata?.newReviewUri||'')||(location.metadata?.placeId?`https://search.google.com/local/writereview?placeid=${encodeURIComponent(location.metadata.placeId)}`:'');
 return {name:String(location.title||'Unnamed business'),niche:String(location.categories?.primaryCategory?.displayName||'Local business'),description:String(location.profile?.description||''),address:[...(a.addressLines||[]),a.sublocality,a.locality,a.administrativeArea,a.postalCode,a.regionCode].filter(Boolean).join(', '),city:String(a.locality||a.administrativeArea||''),phone:String(location.phoneNumbers?.primaryPhone||''),website:String(location.websiteUri||''),whatsapp:String(whatsapp),image:String(photo?.googleUrl||photo?.thumbnailUrl||''),services:[...new Set(names)].slice(0,50).join(', '),url:reviewUrl};
}
export function normalizeReviews(data:any){return {averageRating:data.averageRating??null,totalReviewCount:data.totalReviewCount??0,nextPageToken:data.nextPageToken||'',fetchedAt:new Date().toISOString(),reviews:(data.reviews||[]).map((r:any)=>({reviewId:r.reviewId,reviewer:r.reviewer?.displayName||'Google user',photo:r.reviewer?.profilePhotoUrl||'',rating:({ONE:1,TWO:2,THREE:3,FOUR:4,FIVE:5} as Record<string,number>)[r.starRating]||0,comment:r.comment||'',created:r.createTime,reply:r.reviewReply?.comment||''}))};}
