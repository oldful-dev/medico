import React from 'react';
import { Alert } from 'react-native';
import ServiceDetailScreen from '@/components/services/ServiceDetailScreen';
import ImageUploadBox from '@/components/common/ImageUploadBox';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { mediaService } from '@/services/api/mediaService';
import { useRouter } from 'expo-router';

const imgHero = require('@/assets/images/6c8ed456023258e8b4095af93909c6cbc6c4b909.png');

export default function AnythingElseScreen() {
    const router = useRouter();
    const [selectedImages, setSelectedImages] = React.useState<string[]>([]);
    const [isBooking, setIsBooking] = React.useState(false);

    const { isReady, cityId, serviceId, serviceName, servicePrice, address, isLoading } =
        useServiceInitialization('anything-else');

    const handleBook = async () => {
        if (!address || address.trim().length < 5 || address === 'Fetching address...') {
            Alert.alert('Address Required', 'Could not fetch your address. Please wait or try again.');
            return;
        }
        if (!isReady) {
            Alert.alert('Error', 'Service initialization incomplete. Please try again.');
            return;
        }
        try {
            setIsBooking(true);
            const uploadedImageUrls = selectedImages.length > 0
                ? await mediaService.uploadMultipleMedia(selectedImages, 'anything-else')
                : [];
            router.push({
                pathname: '/payment/checkout',
                params: {
                    bookingPayload: JSON.stringify({
                        serviceId, cityId,
                        scheduledDate: new Date().toISOString(),
                        addressLine: address,
                        formDataJson: { attachments: uploadedImageUrls },
                    }),
                    amount: String(servicePrice),
                    label: serviceName || 'Anything Else',
                },
            });
        } catch {
            Alert.alert('Error', 'Failed to upload. Please check your connection.');
        } finally {
            setIsBooking(false);
        }
    };

    return (
        <ServiceDetailScreen
            headerTitle="Anything Else?"
            heroTitle="Anything Else?"
            heroSubtitle="Concierge Services"
            description="Need help with something not on our list? Tell us what you need — our team will handle it."
            heroImage={imgHero}
            pricingLabel="₹299 Concierge Fee (varies by task)"
            pricingNote="*Final price depends on the complexity of the request."
            bulletItems={[
                'Personal Errands & Pickups',
                'Form Filling & Documentation',
                'Gift Sourcing & Delivery',
                'Custom Task Assistance',
            ]}
            address={address}
            onBook={handleBook}
            isLoading={isLoading || isBooking}
        >
            <ImageUploadBox
                title="Select An Image Of Scrap Items"
                subtitle="JPG, PNG or PDF, file size no more than 10MB"
                onImagesChange={setSelectedImages}
                maxImages={3}
            />
        </ServiceDetailScreen>
    );
}
