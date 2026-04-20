import React from 'react';
import { Alert } from 'react-native';
import ServiceDetailScreen from '@/components/services/ServiceDetailScreen';
import ImageUploadBox from '@/components/common/ImageUploadBox';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { mediaService } from '@/services/api/mediaService';
import { useRouter } from 'expo-router';

const imgHero = require('@/assets/images/fa6360cf6179cebaed29a6c808bafae2d31ad753.png');

export default function ApplianceRepairScreen() {
    const router = useRouter();
    const [selectedImages, setSelectedImages] = React.useState<string[]>([]);
    const [isBooking, setIsBooking] = React.useState(false);

    const { isReady, cityId, serviceId, serviceName, servicePrice, address, isLoading } =
        useServiceInitialization('appliance-repair');

    const handleBook = async () => {
        if (!isReady) {
            Alert.alert('Error', 'Service initialization incomplete. Please try again.');
            return;
        }
        try {
            setIsBooking(true);
            const uploadedImageUrls = selectedImages.length > 0
                ? await mediaService.uploadMultipleMedia(selectedImages, 'appliance-repair')
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
                    label: serviceName || 'Appliance Repair',
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
            headerTitle="AC & Appliance Repair"
            heroTitle="AC & Appliance Repair"
            heroSubtitle="Concierge Services"
            description="Book a reliable technician for AC, refrigerator, washing machine, and other household appliance repairs."
            heroImage={imgHero}
            pricingLabel="₹499 Booking Fee + Vendor's Bill"
            pricingNote="*The vendor's bill depends on the actual work needed."
            bulletItems={[
                'AC Servicing & Repair (Split & Window ACs)',
                'Refrigerator Repair',
                'Washing Machine Repair',
                'Microwave & Other Appliances',
            ]}
            address={address}
            onBook={handleBook}
            isLoading={isLoading || isBooking}
        >
            <ImageUploadBox
                title="Select An Image Of Scrap Items"
                subtitle="JPG, PNG or PDF, file size no more than 10MB"
                onImagesChange={setSelectedImages}
                maxImages={5}
            />
        </ServiceDetailScreen>
    );
}
