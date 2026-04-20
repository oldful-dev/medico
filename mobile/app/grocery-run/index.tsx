import React from 'react';
import { Alert } from 'react-native';
import ServiceDetailScreen from '@/components/services/ServiceDetailScreen';
import ImageUploadBox from '@/components/common/ImageUploadBox';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { useRouter } from 'expo-router';

const imgHero = require('@/assets/images/8888c71f466119aa294bd00136ff887f616d4737.png');

export default function GroceryRunScreen() {
    const router = useRouter();
    const [selectedImages, setSelectedImages] = React.useState<string[]>([]);
    const [isBooking, setIsBooking] = React.useState(false);

    const { isReady, cityId, serviceId, serviceName, servicePrice, address, isLoading } =
        useServiceInitialization('grocery-run');

    const handleBook = async () => {
        if (!isReady) {
            Alert.alert('Error', 'Service initialization incomplete. Please try again.');
            return;
        }
        try {
            setIsBooking(true);
            router.push({
                pathname: '/payment/checkout',
                params: {
                    bookingPayload: JSON.stringify({
                        serviceId, cityId,
                        scheduledDate: new Date().toISOString(),
                        addressLine: address,
                        formDataJson: {},
                    }),
                    amount: String(servicePrice),
                    label: serviceName || 'Grocery Run',
                },
            });
        } catch {
            Alert.alert('Error', 'Something went wrong. Please check your connection.');
        } finally {
            setIsBooking(false);
        }
    };

    return (
        <ServiceDetailScreen
            headerTitle="Grocery Run"
            heroTitle="Grocery Run"
            heroSubtitle="Concierge Services"
            description="Share your grocery list and our concierge will shop from your nearest store and deliver to your doorstep."
            heroImage={imgHero}
            pricingLabel="₹99 Delivery Fee + Grocery Bill"
            pricingNote="*Grocery bill is charged separately based on actual market price."
            bulletItems={[
                'Fruits, Vegetables & Dairy',
                'Medicines & Pharmacy Items',
                'Monthly Ration & Staples',
                'Same-Day Delivery Available',
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
